/* Test de bout en bout : charge index.html, parcourt les volets et les fonctions clés, échoue sur toute erreur JavaScript.
   Aucun appel réseau sortant (les CDN sont servis localement ou neutralisés). */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lw = path.join(root, 'node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js');
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1440, height: 900 } }), errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue();
  if (/lightweight-charts/.test(u) && fs.existsSync(lw)) return r.fulfill({ path: lw, contentType: 'application/javascript' }); return r.fulfill({ status: 200, body: '' }); });
await p.goto('file://' + path.join(root, 'index.html')); await p.waitForTimeout(1000);
const step = async (name, fn) => { try { await fn(); console.log('ok   ' + name); } catch (e) { errs.push(name + ' : ' + e.message); console.log('FAIL ' + name); } };
for (const t of ['bp', 'an', 'sc', 'lbo', 'pf', 'cm', 'pc', 'jr']) await step('volet ' + t, () => p.evaluate(t => { ui.tab = t; renderAll(); }, t));
for (const a of ['brent', 'gold', 'silver']) await step('commodities ' + a, () => p.evaluate(a => { ui.tab = 'cm'; ui.cmA = a; ui.cmOv = { cpi: true, ff: true, wasde: true, gsb: true }; renderAll(); }, a));
await step('commodities : aucune case vide, séries jusqu\'au 12/11/2026', () => p.evaluate(() => {
  if (cmSeries().d.slice(-1)[0] !== '2026-11-12') throw new Error('dernière séance ' + cmSeries().d.slice(-1)[0]);
  const bad = [];
  for (const T of ['t', 'c']) for (const a of ['brent', 'gold', 'silver']) { ui.tab = 'cm'; ui.cmA = a; ui.cmT = T; renderAll();
    document.querySelectorAll('#p-cm table.tbl td, #p-cm .card b, #p-cm .card span').forEach(e => { if (e.children.length) return; const t = e.textContent.trim();
      if ((e.tagName === 'TD' && t === '') || /^(—|NO DATA|NaN|undefined|n\.d\.)$/.test(t) || /pas de donnée/.test(t)) bad.push(T + '/' + a + ' : ' + (e.closest('tr') || e).textContent.replace(/\s+/g, ' ').slice(0, 60)); }); }
  if (bad.length) throw new Error(bad.length + ' case(s) vide(s) : ' + bad.slice(0, 3).join(' | '));
}));
await step('mapping multi-actifs', async () => { await p.evaluate(() => { ui.tab = 'an'; renderAll(); }); await p.click('[data-act=anmopen]');
  for (const c of ['stk', 'etf', 'cry', 'cmd']) await p.evaluate(c => { S.mm.cls = c; renderAnMap(); if (!document.querySelectorAll('#anmap svg.mm .pt').length) throw new Error('quadrant vide ' + c); }, c); });
await step('clic ETF vers analyse', async () => { await p.evaluate(() => { S.mm.cls = 'etf'; renderAnMap(); }); await p.click('#anmap svg.mm .pt[data-id="SPY"]');
  if (await p.evaluate(() => document.querySelector('#p-an .sh-t')?.textContent) !== 'SPY') throw new Error('slide ETF absente'); });
await step('recherche universelle', async () => { await p.keyboard.press('Control+k'); await p.keyboard.type('bitc'); await p.keyboard.press('Enter');
  if (await p.evaluate(() => ui.anX && ui.anX.id) !== 'BTC') throw new Error('BTC non ouvert'); });
await step('mode simple et alertes', () => p.evaluate(() => { document.getElementById('uxMode').click(); document.getElementById('uxBell').click(); if (!document.getElementById('uxal') || document.getElementById('uxal').hidden) throw new Error('panneau alertes'); }));
await step('création par lecture IA (navigateur et Claude simulés)', () => p.evaluate(async () => {
  const pages = { 'https://stockanalysis.com/quote/epa/RMS/': 'Hermes International (EPA:RMS) 2,104.00 EUR Nov 11, 2026 Shares Out 104.7M ' + 'Market data. '.repeat(60),
    'https://stockanalysis.com/quote/epa/RMS/financials/': 'Financials in millions EUR FY 2025 FY 2024 FY 2023 FY 2022 FY 2021 Revenue 16,002 15,170 13,427 11,602 8,982 Net Income 4,524 4,603 4,311 3,367 2,445',
    'https://stockanalysis.com/quote/epa/RMS/financials/ratios/': 'ROE 28.1% EBITDA margin 47.9%' };
  AI.mcp = {}; AI.sample = { json: async () => ({ name: 'Hermès', sector: 'Luxe', currency: 'EUR', fiscal_years: [2021, 2022, 2023, 2024, 2025], revenue: [8982, 11602, 13427, 15170, 16002],
    ebitda: [null, null, null, null, null], ebitda_margin_pct: [45, 46, 47, 47.5, 47.9], net_income: [2445, 3367, 4311, 4603, 4524], eps: [23.3, 32.09, 41.12, 43.87, 43.07],
    fcf: [3002, 3770, 3750, 4072, 4666], net_debt: [-9000, -9500, -10000, -11000, -12000], roe_pct: [25, 27, 28, 28.5, 28.1], shares: 104.7, price: 2104, price_date: '2026-11-11' }) };
  aiPage = async u => pages[u] || 'page not found';
  await uxCreate('RMS.PA'); const a = S.an.assets[ui.tk];
  if (a.rev[4] !== 16002 || a.ni[0] !== 2445 || a.price !== 2104 || Math.round(a.ebitda[4]) !== 7665) throw new Error('comptes mal appliqués ' + JSON.stringify([a.rev, a.ebitda, a.price]));
  AI.sample = { json: async () => ({ fiscal_years: [2025], revenue: [99999], net_income: [11111] }) };   // montants absents des pages : doit être rejeté
  const before = Object.keys(S.an.assets).length; await uxCreate('EPA:XYZ'); const z = S.an.assets[ui.tk];
  if (z.rev.some(v => v)) throw new Error('extraction non vérifiée acceptée');
}));
await step('cours recoupés entre sites (navigateur et Claude simulés)', () => p.evaluate(async () => {
  const pad = 'Cours, graphique, actualités. '.repeat(20), P = {
    'https://www.google.com/finance/quote/MC:EPA': 'PRICE=403.10 ' + pad, 'https://www.tradingview.com/symbols/EURONEXT-MC/': 'PRICE=404.70 ' + pad,
    'https://www.google.com/finance/quote/AIR:EPA': 'PRICE=150.00 ' + pad, 'https://www.tradingview.com/symbols/EURONEXT-AIR/': 'PRICE=210.70 ' + pad, 'https://stockanalysis.com/quote/epa/AIR/': 'PRICE=211.20 ' + pad };
  AI.mcp = {}; aiPage = async u => P[u] || 'page not found';
  AI.sample = { json: async q => { const m = q.match(/PRICE=([\d.]+)/); return { price: m ? +m[1] : null, currency: 'EUR', date: '2026-11-12' }; } };
  S.an.assets.MC.pxManual = false; S.an.assets.AIR.pxManual = false;
  await aiRefreshPrices();
  const mc = S.an.assets.MC, air = S.an.assets.AIR, ko = S.an.assets.KO;
  if (mc.price !== 403.1 && mc.price !== 404.7) throw new Error('MC non recoupé ' + mc.price);
  if (!/Recoupé · Google Finance et TradingView/.test(mc.pxSrc)) throw new Error('source MC ' + mc.pxSrc);
  if (![210.7, 211.2].includes(air.price) || !/TradingView et stockanalysis/.test(air.pxSrc)) throw new Error('AIR : la source discordante devait être écartée ' + air.price + ' ' + air.pxSrc);
  if (/lecture IA/.test(ko.pxSrc || '')) throw new Error('KO sans page lisible ne devait pas changer');
}));
await step('étude de marché du BP par Claude (navigateur et Claude simulés)', () => p.evaluate(async () => {
  ui.tab = 'bp'; renderAll(); if (!document.querySelector('#p-bp .rsbar [data-act=rsbp]')) throw new Error('bouton Lancer la recherche absent');
  const U = 'https://www.insee.fr/fr/statistiques/marche-test', body = 'Étude sectorielle. Le marché français atteint 4 200 M€ en 2025, contre 3 900 M€ en 2024. Croissance annuelle moyenne attendue de 5,2 % sur 2025-2030. '.repeat(4);
  AI.mcp = {}; aiPage = async u => /duckduckgo/.test(u) ? 'Résultats : www.insee.fr/fr/statistiques/marche-test Étude du marché '.repeat(10) : u === U ? body : 'page not found';
  AI.sample = { json: async q => /Résultats d'une recherche/.test(q) ? { urls: [U] } : { market_label: 'Marché test France', currency: 'EUR', unit: 'M', year: 2025, tam: 4200, cagr_pct: 5.2, cagr_horizon: '2025-2030',
    hist: [{ year: 2024, value: 3900 }, { year: 2025, value: 4200 }], sources: [{ url: U, quote: 'Le marché français atteint 4 200 M€ en 2025' }] } };
  await rsMarket();
  if (S.bp.tamOv !== 4200 || !S.bp.tamAI || S.bp.cagrOv !== 5.2) throw new Error('BP non alimenté ' + S.bp.tamOv + ' ' + S.bp.cagrOv);
  if (!S.bp.mktAI || S.bp.mktAI.how !== 'claude' || !/insee/.test(S.bp.mkt.src)) throw new Error('moteur ou source BP');
  const t0 = S.bp.tamOv; AI.sample = { json: async q => /Résultats d'une recherche/.test(q) ? { urls: [U] } : { tam: 9999, sources: [{ url: U, quote: 'phrase inventée absente de la page' }] } };
  await rsMarket(); if (S.bp.tamOv !== t0) throw new Error('extrait non vérifiable accepté');
}));
await step('dossier LBO : Claude indisponible, repli sur l\'API (simulée)', () => p.evaluate(async () => {
  if (!S.lbo.list.length) lboNew(Object.keys(S.an.assets).map(k => 'an:' + k)[0]); ui.tab = 'lbo'; renderAll();
  if (!document.querySelector('#p-lbo .rsbar [data-act=rslbo]')) throw new Error('bouton LBO absent');
  const d = lboCur(); AI.mcp = null; AI.sample = null; FLUX.on = true; let sent = null;
  liveApi = async (path, o = {}) => { if (path === '/api/v1/ai/ingest' && o.method === 'POST') sent = { path, body: o.body }; return { record: { payload: { euribor_3m_pct: 2.051, euribor_date: '2026-11-11', sector_label: 'Luxe', sector_ev_ebitda: 13.5, sector_source: 'Étude test', sources: [{ url: 'https://x', quote: 'q' }] } }, cached: false, tokens: 900 }; };
  await rsLbo(); FLUX.on = false;
  if (!sent || sent.path !== '/api/v1/ai/ingest' || sent.body.module !== 'lbo' || sent.body.trigger !== 'recalc') throw new Error('appel API ' + JSON.stringify(sent));
  if (d.p.euribor !== 2.051 || d.p.entryMult !== 13.5 || !['infra', 'byok'].includes(d.rsAI.how)) throw new Error('LBO non alimenté ' + d.p.euribor + ' ' + d.p.entryMult);
  const e0 = d.p.euribor; await rsLbo(); if (d.p.euribor !== e0) throw new Error('sans moteur, rien ne doit changer');
}));
await step('Recalculer : volet affiché seulement, Claude puis repli sur votre clé après délai dépassé', () => p.evaluate(async () => {
  ui.tab = 'cm'; ui.cmA = 'gold'; renderAll(); if (!document.querySelector('#p-cm .rsbar [data-act=rscm]')) throw new Error('bouton commodities absent');
  const last = rsCmLast('gold').v, P = { 'https://www.tradingview.com/symbols/TVC-GOLD/': ('Gold spot price PRICE=' + (last * 1.01).toFixed(2) + ' USD per troy ounce. ').repeat(30),
    'https://www.investing.com/commodities/gold': ('Gold Futures PRICE=' + (last * 1.012).toFixed(2) + ' USD. ').repeat(30) };
  AI.mcp = {}; aiPage = async u => P[u] || 'page not found'; FLUX.on = false;
  AI.sample = { json: async q => { const m = q.match(/PRICE=([\d.]+)/); return { price: m ? +m[1] : null, currency: 'USD', date: '2026-11-12' }; } };
  let calls = []; const _bp = rsMarket, _lbo = rsLbo; rsMarket = () => calls.push('bp'); rsLbo = () => calls.push('lbo');
  document.querySelector('[data-act=recalc]').click();
  if (!/pulse/.test(document.querySelector('#aiBtn .dot').className)) throw new Error('voyant non pulsé pendant la collecte');
  for (let i = 0; i < 50 && RS.busy.cm; i++) await new Promise(r => setTimeout(r, 20));
  rsMarket = _bp; rsLbo = _lbo; if (calls.length) throw new Error('autres volets appelés : ' + calls);
  const g = S.cm.add.gold['2026-11-12']; if (!g || Math.abs(g[0] / last - 1.01) > 0.003 || !S.cm.rsAI.gold.checked) throw new Error('or non recoupé ' + JSON.stringify(g));
  if (!/ok/.test(document.querySelector('#aiBtn .dot').className)) throw new Error('voyant non revenu au vert');
  /* Claude ne répond pas : repli automatique sur le backend, moteur « byok » rapporté par le serveur */
  RS.to = 60; AI.sample = { json: () => new Promise(() => {}) }; FLUX.on = true; RS.key = { has: true, last4: 'abcd', infra: true }; let sent = null;
  liveApi = async (path, o = {}) => { if (path === '/api/v1/ai/ingest' && o.method === 'POST') { sent = o.body; return { engine: 'byok', cached: false, tokens: 700, record: { payload: { instrument: 'gold', rows: [{ date: '2026-11-11', close: +(last * 1.005).toFixed(2) }] } } }; } return {}; };
  await rsCm('recalc'); FLUX.on = false; RS.to = 0;
  if (!sent || sent.module !== 'cm' || sent.force !== true || sent.subject !== 'gold') throw new Error('repli backend ' + JSON.stringify(sent));
  if (S.cm.rsAI.gold.how !== 'byok' || !S.cm.add.gold['2026-11-11']) throw new Error('moteur de repli ' + S.cm.rsAI.gold.how);
}));
await b.close();
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log('Test de bout en bout : aucune erreur');
