/* Tests unitaires du backend : node --test --experimental-strip-types tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
const { encrypt, decrypt, sha256 } = await import('../lib/crypto.ts');
const { binanceSign, krakenSign, okxSign, coinbaseJwt, binance, kraken } = await import('../lib/brokers/crypto-exchanges.ts');
const { parseFlex } = await import('../lib/brokers/securities.ts');
const { computeSeries, zScore, corr } = await import('../lib/series.ts');
const { validate } = await import('../api/v1/trading/mt-sync.ts');
const { mapStt } = await import('../api/v1/trading/stt-sync.ts');
const { confidence, htmlToText } = await import('../api/v1/ai/market-parser.ts');
const { summarize } = await import('../api/v1/portfolio/pnl.ts');

test('chiffrement AES-256-GCM : aller-retour et détection d\'altération', () => {
  const c = encrypt(JSON.stringify({ apiKey: 'k', apiSecret: 's' }));
  assert.equal(JSON.parse(decrypt(c)).apiSecret, 's');
  const p = c.split('.'); p[3] = Buffer.from('autre').toString('base64');
  assert.throws(() => decrypt(p.join('.')));
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('signature Binance : exemple de la documentation officielle', () => {
  const qs = 'symbol=LTCBTC&side=BUY&type=LIMIT&timeInForce=GTC&quantity=1&price=0.1&recvWindow=5000&timestamp=1499827319559';
  assert.equal(binanceSign(qs, 'NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5fATj0j'), 'c8db56825ae71d6d79447849e617115f4a920fa2acdcab2b053c4b2838bd6b71');
});
test('signature Kraken : exemple de la documentation officielle', () => {
  const s = krakenSign('/0/private/AddOrder', '1616492376594', 'nonce=1616492376594&ordertype=limit&pair=XBTUSD&price=37500&type=buy&volume=1.25', 'kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg==');
  assert.equal(s, '4/dpxb3iT4tp/ZCVEwSnEsLxx0bqyhLpdfOpc6fn7OR8+UClSV5n9E6aSS8MPtnRfp32bAb0nmbRn6H8ndwLUQ==');
});
test('signature OKX : HMAC-SHA256 base64 du préfixe horodatage + méthode + chemin', () => {
  assert.match(okxSign('2020-12-08T09:08:57.715Z', 'GET', '/api/v5/account/balance', '', 'secret'), /^[A-Za-z0-9+/]{43}=$/);
});
test('JWT Coinbase ES256 vérifiable avec la clé publique', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwt = coinbaseJwt('organizations/x/apiKeys/y', privateKey.export({ type: 'sec1', format: 'pem' }).toString(), 'GET', 'api.coinbase.com', '/api/v3/brokerage/accounts', 1700000000);
  const [h, p, sig] = jwt.split('.');
  assert.equal(JSON.parse(Buffer.from(p, 'base64url').toString()).uri, 'GET api.coinbase.com/api/v3/brokerage/accounts');
  assert.ok(createVerify('SHA256').update(`${h}.${p}`).verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url')));
});
test('adaptateur Binance avec réponses simulées', async () => {
  const f = (async (url: string) => {
    if (url.includes('/api/v3/account')) return new Response(JSON.stringify({ balances: [{ asset: 'BTC', free: '0.4', locked: '0.1' }, { asset: 'EUR', free: '250', locked: '0' }, { asset: 'DOGE', free: '0', locked: '0' }] }));
    if (url.includes('symbol=BTCEUR')) return new Response(JSON.stringify({ price: '60000.00' }));
    return new Response('{}', { status: 400 });
  }) as typeof fetch;
  const s = await binance.fetchSnapshot({ apiKey: 'k', apiSecret: 's' }, f);
  assert.deepEqual(s.positions.map(p => [p.symbol, p.quantity, p.last_price, p.currency]), [['BTC', 0.5, 60000, 'EUR']]);
  assert.deepEqual(s.cash, [{ currency: 'EUR', amount: 250 }]);
});
test('adaptateur Kraken : codes d\'actifs normalisés', async () => {
  const f = (async (url: string) => url.includes('Balance') ? new Response(JSON.stringify({ error: [], result: { XXBT: '1.0', ZEUR: '100.5' } })) : new Response(JSON.stringify({ price: '61000' }))) as typeof fetch;
  const s = await kraken.fetchSnapshot({ apiKey: 'k', apiSecret: Buffer.from('x').toString('base64') }, f);
  assert.equal(s.positions[0].symbol, 'BTC'); assert.equal(s.cash[0].currency, 'EUR');
});
test('relevé IBKR Flex : positions et liquidités', () => {
  const x = `<FlexQueryResponse><OpenPositions><OpenPosition symbol="AAPL" description="APPLE INC" assetCategory="STK" position="10" costBasisPrice="180.5" markPrice="270.4" currency="USD" /><OpenPosition symbol="SPY 260116C" assetCategory="OPT" position="2" costBasisPrice="5" markPrice="7" currency="USD"/></OpenPositions><CashReport><CashReportCurrency currency="BASE_SUMMARY" endingCash="999"/><CashReportCurrency currency="EUR" endingCash="1500.25"/></CashReport></FlexQueryResponse>`;
  const r = parseFlex(x);
  assert.deepEqual(r.positions.map(p => [p.symbol, p.asset_class, p.quantity, p.avg_cost]), [['AAPL', 'Actions', 10, 180.5], ['SPY 260116C', 'Options', 2, 5]]);
  assert.deepEqual(r.cash, [{ currency: 'EUR', amount: 1500.25 }]);
});
test('séries : spread, basis, z-score et corrélation', () => {
  const P = (instrument: any, contract: any, d: string, close: number) => ({ instrument, contract, price_date: d, close, source_name: 't' });
  const prices = [P('BRENT', 'SPOT', '2026-01-01', 80), P('WTI', 'SPOT', '2026-01-01', 76), P('BRENT', 'M1', '2026-01-01', 79), P('GOLD', 'SPOT', '2026-01-01', 4000), P('SILVER', 'SPOT', '2026-01-01', 50)];
  const s = computeSeries(prices);
  const v = (n: string) => s.find(x => x.series === n)?.value;
  assert.equal(v('SPREAD_BRENT_WTI'), 4); assert.equal(v('BASIS_BRENT'), 1); assert.equal(v('RATIO_GOLD_SILVER'), 80);
  assert.equal(+zScore([1, 2, 3, 4, 5], 4, 5)!.toFixed(4), 1.2649);
  assert.equal(+corr([1, 2, 3, 4], [2, 4, 6, 8], 3, 4)!.toFixed(6), 1);
});
test('validation de la charge utile MetaTrader', () => {
  const ok = { account: { platform: 'MT5', login: 123, currency: 'EUR', balance: 1000, equity: 1010 }, positions: [{ ticket: 1, symbol: 'XAUUSD', side: 'buy', volume: 0.1 }], history: [] } as any;
  assert.equal(validate(ok), null);
  assert.match(validate({ ...ok, positions: [{ symbol: 'X', side: 'long', volume: 1 }] })!, /position invalide/);
  assert.match(validate({ positions: [] } as any)!, /account/);
});
test('SocialTraderTools : correspondance des champs', () => {
  const p = mapStt({ login: '42', currency: 'USD', balance: '1000', equity: '1100', open_trades: [{ id: 7, symbol: 'EURUSD', type: 'SELL', lots: '0.5', open_price: '1.1', profit: '20' }] });
  assert.equal(p.positions[0].side, 'sell'); assert.equal(p.positions[0].volume, 0.5); assert.equal(validate(p), null);
});
test('IA : score de confiance et nettoyage HTML', () => {
  assert.equal(confidence(0.9, true, true), 0.9); assert.equal(confidence(0.9, true, false), 0.6); assert.equal(confidence(0.9, false, false), 0.2);
  assert.equal(htmlToText('<p>Euribor <b>2,676&nbsp;%</b></p><script>x()</script>'), 'Euribor 2,676 %');
});
test('risque : RR consolidé et lignes sans stop', () => {
  const r = summarize([{ risk_eur: 100, reward_eur: 250, stop_loss: 1 } as any, { risk_eur: null, reward_eur: 50, stop_loss: null } as any]);
  assert.equal(r.rr, 3); assert.equal(r.unprotected, 1);
});

test('BCE : paires du sélecteur universel déduites des taux de référence', async () => {
  const { ecbCrosses } = await import('../lib/macro.ts');
  const out = ecbCrosses([{ currency: 'USD', rate_date: '2026-10-30', rate: 1.16 }, { currency: 'GBP', rate_date: '2026-10-30', rate: 0.87 }, { currency: 'JPY', rate_date: '2026-10-30', rate: 174 }]);
  const v = (i: string) => out.find(p => p.instrument === i)?.close;
  assert.equal(v('EURUSD'), 1.16); assert.equal(v('GBPUSD'), +(1.16 / 0.87).toFixed(6)); assert.equal(v('USDJPY'), +(174 / 1.16).toFixed(6));
  assert.equal(v('AUDUSD'), undefined);
});

test('versions : empreinte canonique indépendante de l\'ordre des clés, signature HMAC', async () => {
  const { canon, contentHash, sign } = await import('../lib/team.ts');
  assert.equal(canon({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: null } }), '{"a":{"c":null,"d":[1,{"x":1,"y":2}]},"b":1}');
  assert.equal(contentHash({ a: 1, b: 2 }), contentHash({ b: 2, a: 1 }));
  assert.notEqual(contentHash({ a: 1 }), contentHash({ a: 2 }));
  process.env.SIGNING_KEY = 's'.repeat(32);
  const s1 = sign('h', 'u', '2026-11-03T00:00:00.000Z');
  assert.match(s1, /^[0-9a-f]{64}$/); assert.notEqual(s1, sign('h', 'u2', '2026-11-03T00:00:00.000Z'));
  process.env.SIGNING_KEY = 'court';
  assert.throws(() => sign('h', 'u', 'x'));
});
const AI8 = await import('../lib/ai-ingest.ts');
test('ingestion IA v8 : déclenchement explicite, un module par appel, cache servi à 0 jeton', () => {
  assert.throws(() => AI8.validateIngest({ module: 'all', subject: 'X', trigger: 'recalc' }), /Payload global interdit/);
  assert.throws(() => AI8.validateIngest({ module: 'bp,an', subject: 'X', trigger: 'recalc' }), /Payload global interdit/);
  assert.throws(() => AI8.validateIngest({ module: 'an', subject: 'MC', trigger: 'load' }), /Déclenchement explicite/);
  assert.throws(() => AI8.validateIngest({ module: 'an', subject: 'MC', trigger: 'recalc', url: 'http://x' }), /https/);
  const v = AI8.validateIngest({ module: 'an', subject: 'mc', trigger: 'recalc', url: 'https://example.com' });
  assert.equal(AI8.cacheKey(v.module, v.subject), 'an:MC');
  const now = Date.parse('2026-11-10T12:00:00Z'), rec = { timestamp_retrieved: '2026-11-08T12:00:00Z' };
  assert.deepEqual(AI8.cacheDecision(null, 'an', 'recalc', false, now).serve, false);
  assert.equal(AI8.cacheDecision(rec, 'an', 'recalc', false, now).serve, true);   // 48 h < 7 j : servi depuis la base
  assert.equal(AI8.cacheDecision(rec, 'an', 'recalc', true, now).serve, false);   // force : nouvel appel
  assert.equal(AI8.cacheDecision(rec, 'cm', 'recalc', false, now).serve, false);  // 48 h > 24 h : périmé
  assert.equal(AI8.cacheDecision(rec, 'cm', 'init', false, now).serve, true);     // init ne rappelle jamais si une extraction existe
});
test('ingestion IA v8 : JSON strict par outil forcé, champs requis, extraits vérifiés', () => {
  const r = AI8.buildRequest('bp', 'claude-haiku-5-5', 'Dossier A', 'texte', 'https://s.example');
  assert.equal(r.tool_choice.name, 'market_study'); assert.equal(r.tools.length, 1);
  assert.throws(() => AI8.parseResponse({ content: [{ type: 'text' }] }, 'bp'), /non conforme/);
  assert.throws(() => AI8.parseResponse({ content: [{ type: 'tool_use', name: 'market_study', input: { tam: 1 } }] }, 'bp'), /Champs manquants/);
  const p = AI8.parseResponse({ content: [{ type: 'tool_use', name: 'price_series', input: { instrument: 'BRENT', rows: [{ date: '2026-11-03', close: 107.03 }], confidence: 0.9, sources: [{ url: 'u', quote: 'Brent 107,03 le 03/11' }] } }], usage: { input_tokens: 1200, output_tokens: 80 } }, 'cm');
  assert.equal(p.tokens.input + p.tokens.output, 1280);
  assert.equal(AI8.verifyQuotes(p.payload, 'Cours : Brent 107,03 le 03/11/2026', p.confidence).confidence, 0.9);
  assert.equal(AI8.verifyQuotes(p.payload, 'page sans la valeur', p.confidence).confidence, 0.3);
});
test('SEC EDGAR : cinq exercices au format de l\'analyse, exercice identifié par sa date de clôture', async () => {
  const { toStatements, findCik } = await import('../lib/sec.ts');
  const fs = await import('node:fs');
  const st = toStatements(JSON.parse(fs.readFileSync(new URL('./fixtures/sec-costco.json', import.meta.url), 'utf8')));
  assert.equal(st.ends.length, 5); assert.equal(st.ends[4], '2026-08-30'); assert.equal(st.years[4], 'FY2026');
  assert.equal(st.rev[4], 303154); assert.equal(st.ni[4], 9226);
  assert.equal(st.ebitda[4], 14359);            // résultat opérationnel 11 685 + amortissements 2 674
  assert.equal(st.fcf[4], 9382);                // flux d'exploitation 15 817 − investissements 6 435
  assert.equal(st.nd[4], -14045);               // dette 3 914 + 2 248 − trésorerie 20 207
  assert.equal(st.roe[4], 25.77); assert.equal(st.rev[3], 275235); assert.ok(st.shares && st.shares > 400);
  assert.deepEqual(findCik({ 0: { cik_str: 909832, ticker: 'COST', title: 'COSTCO' } }, 'cost'), { cik: '0000909832', title: 'COSTCO' });
});
test('cours du soir : CoinGecko, Tiingo et EODHD convertis en points datés et sourcés', async () => {
  const P = await import('../lib/prices.ts');
  const c = P.parseCoinGecko({ bitcoin: { usd: 73732.39, last_updated_at: 1794441600 }, solana: { usd: 83.3 } });
  assert.equal(c.length, 1); assert.equal(c[0].instrument, 'CRY:BTC'); assert.equal(c[0].price_date, '2026-11-12');
  assert.equal(P.parseTiingo('AAPL', [{ date: '2026-11-10T00:00:00.000Z', close: 350 }, { date: '2026-11-11T00:00:00.000Z', close: 355.63 }])[0].close, 355.63);
  assert.equal(P.parseEodhd('MC.PA', [{ date: '2026-11-11', close: 403.1 }, { date: '2026-11-10', close: 400 }])[0].price_date, '2026-11-11');
  const r = await P.fetchDailyPrices({}, (async () => ({ ok: true, json: async () => ({ ethereum: { usd: 2051, last_updated_at: 1794441600 } }) })) as unknown as typeof fetch);
  assert.equal(r.prices.length, 1); assert.equal(r.errors.length, 0);  // aucune clé requise
});
test('lecture IA des pages publiques : pages déduites du ticker, trois pages au plus', async () => {
  const AI = await import('../lib/ai-ingest.ts');
  assert.deepEqual(AI.companyPages('RMS.PA').urls, ['https://stockanalysis.com/quote/epa/RMS/', 'https://stockanalysis.com/quote/epa/RMS/financials/', 'https://stockanalysis.com/quote/epa/RMS/financials/ratios/']);
  assert.equal(AI.companyPages('EPA:MC').path, 'quote/epa/MC'); assert.equal(AI.companyPages('cost').path, 'stocks/cost');
  const v = AI.validateIngest({ module: 'an', subject: 'RMS.PA', trigger: 'init', urls: ['https://a.example', 'https://b.example', 'https://c.example'] });
  assert.equal(v.urls.length, 3);
  assert.equal(AI.validateIngest({ module: 'an', subject: 'X', trigger: 'init', urls: ['https://a.example','https://b.example','https://c.example','https://d.example','https://e.example'] }).urls.length, 4);
});
