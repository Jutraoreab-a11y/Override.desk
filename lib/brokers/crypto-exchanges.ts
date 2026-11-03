/* Adaptateurs d'exchanges crypto : soldes en lecture seule (clés « lecture » uniquement). */
import { createHmac, createHash, createSign, randomBytes } from 'node:crypto';
import type { BrokerAdapter, BrokerCredentials, BrokerSnapshot, Position, CashBalance } from '../../types/models.ts';
import { cryptoPrice, krakenAsset } from './prices.ts';

const FIAT = new Set(['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'JPY']);
async function toSnapshot(bal: Array<[string, number]>, f: typeof fetch): Promise<BrokerSnapshot> {
  const positions: Position[] = [], cash: CashBalance[] = [];
  for (const [asset, qty] of bal) {
    if (!(qty > 0)) continue;
    if (FIAT.has(asset)) { cash.push({ currency: asset, amount: qty }); continue; }
    const p = await cryptoPrice(asset, f);
    positions.push({ symbol: asset, name: asset, asset_class: 'Crypto', quantity: qty, avg_cost: null, last_price: p.price, currency: p.currency });
  }
  return { positions, cash };
}

/** Binance : GET /api/v3/account signé HMAC-SHA256 (query string), en-tête X-MBX-APIKEY. */
export function binanceSign(query: string, secret: string): string { return createHmac('sha256', secret).update(query).digest('hex'); }
export const binance: BrokerAdapter = {
  id: 'binance', label: 'Binance', required: ['apiKey', 'apiSecret'],
  async fetchSnapshot(c: BrokerCredentials, f: typeof fetch = fetch) {
    const qs = `omitZeroBalances=true&recvWindow=10000&timestamp=${Date.now()}`;
    const r = await f(`https://api.binance.com/api/v3/account?${qs}&signature=${binanceSign(qs, c.apiSecret!)}`, { headers: { 'X-MBX-APIKEY': c.apiKey! } });
    if (!r.ok) throw new Error(`Binance HTTP ${r.status}`);
    const j = await r.json() as { balances: Array<{ asset: string; free: string; locked: string }> };
    return toSnapshot(j.balances.map(b => [b.asset, parseFloat(b.free) + parseFloat(b.locked)]), f);
  },
};

/** Kraken : POST /0/private/Balance ; API-Sign = base64(HMAC-SHA512(base64dec(secret), chemin + SHA256(nonce + postdata))). */
export function krakenSign(path: string, nonce: string, postdata: string, secret: string): string {
  const h = createHash('sha256').update(nonce + postdata).digest();
  return createHmac('sha512', Buffer.from(secret, 'base64')).update(Buffer.concat([Buffer.from(path), h])).digest('base64');
}
export const kraken: BrokerAdapter = {
  id: 'kraken', label: 'Kraken', required: ['apiKey', 'apiSecret'],
  async fetchSnapshot(c, f = fetch) {
    const path = '/0/private/Balance', nonce = String(Date.now() * 1000), post = `nonce=${nonce}`;
    const r = await f(`https://api.kraken.com${path}`, { method: 'POST', headers: { 'API-Key': c.apiKey!, 'API-Sign': krakenSign(path, nonce, post, c.apiSecret!), 'Content-Type': 'application/x-www-form-urlencoded' }, body: post });
    const j = await r.json() as { error: string[]; result?: Record<string, string> };
    if (!r.ok || j.error?.length) throw new Error(`Kraken : ${j.error?.join(', ') || r.status}`);
    return toSnapshot(Object.entries(j.result ?? {}).map(([k, v]) => [krakenAsset(k), parseFloat(v)]), f);
  },
};

/** OKX : GET /api/v5/account/balance ; signature base64(HMAC-SHA256(secret, horodatage + méthode + chemin)). */
export function okxSign(ts: string, method: string, path: string, body: string, secret: string): string {
  return createHmac('sha256', secret).update(ts + method + path + body).digest('base64');
}
export const okx: BrokerAdapter = {
  id: 'okx', label: 'OKX', required: ['apiKey', 'apiSecret', 'passphrase'],
  async fetchSnapshot(c, f = fetch) {
    const path = '/api/v5/account/balance', ts = new Date().toISOString();
    const r = await f(`https://www.okx.com${path}`, { headers: { 'OK-ACCESS-KEY': c.apiKey!, 'OK-ACCESS-SIGN': okxSign(ts, 'GET', path, '', c.apiSecret!), 'OK-ACCESS-TIMESTAMP': ts, 'OK-ACCESS-PASSPHRASE': c.passphrase! } });
    const j = await r.json() as { code: string; msg: string; data?: Array<{ details: Array<{ ccy: string; eq: string }> }> };
    if (!r.ok || j.code !== '0') throw new Error(`OKX : ${j.msg || r.status}`);
    return toSnapshot((j.data?.[0]?.details ?? []).map(d => [d.ccy, parseFloat(d.eq)]), f);
  },
};

/** Coinbase Advanced Trade : JWT ES256 (clé CDP) pour GET /api/v3/brokerage/accounts. */
const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');
export function coinbaseJwt(keyName: string, privateKeyPem: string, method: string, host: string, path: string, now = Math.floor(Date.now() / 1000)): string {
  const head = { alg: 'ES256', kid: keyName, nonce: randomBytes(16).toString('hex'), typ: 'JWT' };
  const payload = { sub: keyName, iss: 'cdp', nbf: now, exp: now + 120, uri: `${method} ${host}${path}` };
  const input = `${b64u(JSON.stringify(head))}.${b64u(JSON.stringify(payload))}`;
  const sig = createSign('SHA256').update(input).sign({ key: privateKeyPem.replace(/\\n/g, '\n'), dsaEncoding: 'ieee-p1363' });
  return `${input}.${b64u(sig)}`;
}
export const coinbase: BrokerAdapter = {
  id: 'coinbase', label: 'Coinbase', required: ['keyName', 'privateKey'],
  async fetchSnapshot(c, f = fetch) {
    const host = 'api.coinbase.com', path = '/api/v3/brokerage/accounts';
    const r = await f(`https://${host}${path}?limit=250`, { headers: { Authorization: `Bearer ${coinbaseJwt(c.keyName!, c.privateKey!, 'GET', host, path)}` } });
    if (!r.ok) throw new Error(`Coinbase HTTP ${r.status}`);
    const j = await r.json() as { accounts: Array<{ currency: string; available_balance: { value: string }; hold?: { value: string } }> };
    return toSnapshot(j.accounts.map(a => [a.currency, parseFloat(a.available_balance.value) + parseFloat(a.hold?.value ?? '0')]), f);
  },
};

/** Ledger (cold storage) : soldes des adresses publiques BTC via l'API publique Blockstream (aucune clé). */
export const ledger: BrokerAdapter = {
  id: 'ledger', label: 'Ledger', required: ['addresses'],
  async fetchSnapshot(c, f = fetch) {
    let sats = 0;
    for (const a of c.addresses ?? []) {
      const r = await f(`https://blockstream.info/api/address/${encodeURIComponent(a.trim())}`);
      if (!r.ok) throw new Error(`Adresse ${a} : HTTP ${r.status}`);
      const j = await r.json() as { chain_stats: { funded_txo_sum: number; spent_txo_sum: number } };
      sats += j.chain_stats.funded_txo_sum - j.chain_stats.spent_txo_sum;
    }
    return toSnapshot([['BTC', sats / 1e8]], f);
  },
};
