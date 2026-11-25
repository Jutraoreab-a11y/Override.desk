/* GET /api/v1/oil (réécrit vers api/v1/ai/market-parser?op=oil) — v8.41
   Variations hebdomadaires des stocks de brut US : API (mardi soir) et EIA (mercredi), réel, consensus et précédent,
   lues sur le calendrier économique public de TradingView (sources citées : api.org, eia.gov). Cache Vercel 10 minutes. */
import { send, type Req, type Res } from './http.js';
const KEEP: Record<string, 'api' | 'eia'> = { 'API Crude Oil Stock Change': 'api', 'EIA Crude Oil Stocks Change': 'eia' };
export async function oilData(f: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const from = new Date(Date.now() - 56 * 864e5).toISOString(), to = new Date(Date.now() + 10 * 864e5).toISOString();
  const url = `https://economic-calendar.tradingview.com/events?from=${from}&to=${to}&countries=US`;
  const r = await f(url, { headers: { Origin: 'https://www.tradingview.com', 'User-Agent': 'Mozilla/5.0 FOMO.DESK' } });
  if (!r.ok) throw new Error('TradingView HTTP ' + r.status);
  const j = await r.json() as { result?: Array<Record<string, unknown>> };
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null);
  const ev = (j.result || []).filter(e => KEEP[String(e.title)]).map(e => ({ k: KEEP[String(e.title)], at: String(e.date), actual: num(e.actual), forecast: num(e.forecast), previous: num(e.previous),
    period: e.period || null, src: e.source_url || null })).sort((a, b) => (a.at < b.at ? -1 : 1));
  return { at: new Date().toISOString(), src: 'https://www.tradingview.com/economic-calendar/ (American Petroleum Institute, U.S. Energy Information Administration)', events: ev };
}
export async function oilRoute(_req: Req, res: Res): Promise<void> {
  try { const out = await oilData(); res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=600'); send(res, 200, out); }
  catch (e) { send(res, 502, { error: 'calendrier indisponible : ' + (e instanceof Error ? e.message : String(e)) }); }
}
