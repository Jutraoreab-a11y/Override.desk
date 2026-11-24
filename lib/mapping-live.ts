/* GET /api/v1/mapping?stk=AAPL,MC.PA,ASML.AS (réécrit vers api/v1/ai/market-parser?op=mapping) — v8.34
   Données en direct du mapping : ETF et actions via l'interface publique de TradingView (scanner, cours différé ~10 min),
   cryptos via l'API publique CoinGecko (/coins/markets). Réponse mise en cache 5 minutes par Vercel. */
import { send, q, type Req, type Res } from './http.js';
import { CRYPTO_IDS } from './prices.js';

export const ETF_SYMS = ['SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'EWJ', 'VGK', 'XLE', 'XLK', 'GLD', 'SMH', 'TLT', 'ICLN', 'EWQ', 'EWG', 'INDA', 'FXI', 'XLV', 'XLF', 'ARKK'];
const US_EX = ['NASDAQ', 'NYSE', 'AMEX', 'BATS', 'CBOE'];
const SUF: Record<string, string[]> = { PA: ['EURONEXT'], AS: ['EURONEXT'], BR: ['EURONEXT'], LS: ['EURONEXT'], IR: ['EURONEXT'], DE: ['XETR', 'FWB'], F: ['FWB', 'XETR'], L: ['LSE'], MI: ['MIL'], MC: ['BME'], SW: ['SIX'], TO: ['TSX'], V: ['TSXV'],
  HK: ['HKEX'], T: ['TSE'], SS: ['SSE'], SZ: ['SZSE'], KS: ['KRX'], KQ: ['KRX'], TW: ['TWSE'], TWO: ['TPEX'], AX: ['ASX'], NZ: ['NZX'], NS: ['NSE'], BO: ['BSE'], SA: ['BMFBOVESPA'], MX: ['BMV'],
  ST: ['OMXSTO'], CO: ['OMXCOP'], HE: ['OMXHEX'], OL: ['OSL'], SI: ['SGX'], JO: ['JSE'], VI: ['VIE'], WA: ['GPW'], SR: ['TADAWUL'], IS: ['BIST'], BK: ['SET'], JK: ['IDX'], KL: ['MYX'], TA: ['TASE'], SN: ['BCS'], BA: ['BCBA'] };
/** Candidats TradingView pour un ticker au format Yahoo (AAPL, MC.PA, SAP.DE). */
export function tvCandidates(tk: string): string[] {
  const m = tk.toUpperCase().match(/^([A-Z0-9\-]+)(?:\.([A-Z]+))?$/); if (!m) return [];
  const ex = m[2] ? SUF[m[2]] : US_EX, b = m[2] === 'HK' ? String(+m[1]) : m[1]; return (ex || []).map(e => `${e}:${b.replace('-', '.')}`);
}
async function tvScan(market: string, tickers: string[], columns: string[], f: typeof fetch): Promise<Map<string, unknown[]>> {
  if (!tickers.length) return new Map();
  const r = await f(`https://scanner.tradingview.com/${market}/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 FOMO.DESK' },
    body: JSON.stringify({ symbols: { tickers }, columns }) });
  if (!r.ok) throw new Error('TradingView HTTP ' + r.status);
  const j = await r.json() as { data?: Array<{ s: string; d: unknown[] }> };
  return new Map((j.data || []).map(x => [x.s, x.d]));
}
const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null);
export async function mappingData(stk: string[], f: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const err: Record<string, string> = {}, out: Record<string, unknown> = { at: new Date().toISOString(), err,
    src: { etf: 'https://www.tradingview.com/ (scanner public, cours différé ~10 min)', stk: 'https://www.tradingview.com/ (scanner public)', cry: 'https://api.coingecko.com/api/v3/coins/markets' } };
  const COLS = ['close', 'change', 'Perf.Y', 'Perf.5Y', 'market_cap_basic', 'price_earnings_ttm', 'enterprise_value_ebitda_ttm', 'price_book_fq'];
  const pick = (d: unknown[]) => ({ c: num(d[0]), ch: num(d[1]), p1y: num(d[2]), p5y: num(d[3]), cap: num(d[4]), per: num(d[5]), evE: num(d[6]), pb: num(d[7]) });
  await Promise.all([
    (async () => { try {
      const cand = ETF_SYMS.flatMap(s => US_EX.map(e => `${e}:${s}`)), M = await tvScan('america', cand, COLS, f), etf: Record<string, unknown> = {};
      for (const s of ETF_SYMS) { const hit = US_EX.map(e => M.get(`${e}:${s}`)).find(Boolean); if (hit) etf[s] = pick(hit); else err['etf:' + s] = 'introuvable sur TradingView'; }
      out.etf = etf; } catch (e) { err.etf = String((e as Error).message || e); } })(),
    (async () => { try {
      const list = stk.map(s => s.trim()).filter(s => /^[A-Za-z0-9.\-]{1,16}$/.test(s)).slice(0, 100), cand = list.flatMap(tvCandidates);
      const M = await tvScan('global', cand, COLS, f), res: Record<string, unknown> = {};
      for (const s of list) { const hit = tvCandidates(s).map(t => M.get(t)).find(Boolean); if (hit) res[s] = pick(hit); else err['stk:' + s] = 'introuvable sur TradingView'; }
      out.stk = res; } catch (e) { err.stk = String((e as Error).message || e); } })(),
    (async () => { try {
      const ids = Object.values(CRYPTO_IDS).join(','), r = await f(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=30d,200d,1y`, { headers: { 'User-Agent': 'FOMO.DESK' } });
      if (!r.ok) throw new Error('CoinGecko HTTP ' + r.status);
      const J = await r.json() as Array<Record<string, unknown>>, back = Object.fromEntries(Object.entries(CRYPTO_IDS).map(([k, v]) => [v, k])), cry: Record<string, unknown> = {};
      for (const x of J) { const sym = back[String(x.id)]; if (!sym) continue;
        cry[sym] = { px: num(x.current_price), mc: num(x.market_cap), fdv: num(x.fully_diluted_valuation), vol: num(x.total_volume), ath: num(x.ath), athD: x.ath_date ? String(x.ath_date).slice(0, 10) : null,
          p30: num(x.price_change_percentage_30d_in_currency), p200: num(x.price_change_percentage_200d_in_currency), p1y: num(x.price_change_percentage_1y_in_currency) }; }
      out.cry = cry; } catch (e) { err.cry = String((e as Error).message || e); } })(),
  ]);
  return out;
}
export async function mappingRoute(req: Req, res: Res): Promise<void> {
  const out = await mappingData(String(q(req, 'stk') || '').split(',').filter(Boolean));
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
  send(res, 200, out);
}
