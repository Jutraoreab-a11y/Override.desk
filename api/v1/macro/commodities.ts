/* /api/v1/macro/commodities
   GET ?from=&to=&series=SPREAD_BRENT_WTI,...    : séries synchronisées (pour le multi-tracé du volet 5) et prix
   GET ?action=ingest  (tâche planifiée Vercel)    : EIA (Brent, WTI spot, futures WTI M1-M3) + BCE, puis recalcul des séries
   POST {prices:[PricePoint]} (utilisateur)          : ingestion d'autres sources (or, argent, cuivre, gaz, indices, actions STK:<ticker>…) puis recalcul */
import { handler, body, send, q, HttpError, type Req, type Res } from '../../../lib/http.js';
import { db, check, isCron, requireUser } from '../../../lib/supabase.js';
import { fetchEia, fetchEcb, ecbCrosses } from '../../../lib/macro.js';
import { computeSeries } from '../../../lib/series.js';
import type { PricePoint } from '../../../types/models.js';

const INSTR = /^(BRENT|WTI|GOLD|SILVER|COPPER|NATGAS|EURUSD|GBPUSD|USDJPY|USDCNH|AUDUSD|USDCAD|SPX|NDX|DJI|DAX|CAC|NKX|STK:[A-Z0-9.\-]{1,12})$/;
async function store(prices: PricePoint[]) {
  const s = db();
  if (prices.length) check(await s.from('commodity_prices').upsert(prices.map(p => ({ ...p, retrieved_at: new Date().toISOString() })), { onConflict: 'instrument,contract,price_date' }));
  const since = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
  const all = check(await s.from('commodity_prices').select('instrument,contract,price_date,close,source_name').gte('price_date', since).limit(20000)) as PricePoint[];
  const series = computeSeries(all);
  for (let i = 0; i < series.length; i += 1000) check(await s.from('commodity_series').upsert(series.slice(i, i + 1000).map(x => ({ ...x, computed_at: new Date().toISOString() })), { onConflict: 'series,price_date' }));
  return { prices: prices.length, series: series.length };
}
export default handler(async (req: Req, res: Res) => {
  if (req.method === 'GET' && q(req, 'action') === 'ingest') {
    if (!isCron(req)) throw new HttpError(401, 'Tâche planifiée non autorisée');
    const key = process.env.EIA_API_KEY; if (!key) throw new HttpError(503, 'EIA_API_KEY non configurée');
    const prices = await fetchEia(key);
    const fx = await fetchEcb().catch(() => []);
    if (fx.length) check(await db().from('fx_rates').upsert(fx.map(r => ({ ...r, source: 'BCE' })), { onConflict: 'currency,rate_date' }));
    send(res, 200, { ok: true, fx: fx.length, ...(await store([...prices, ...ecbCrosses(fx)])) }); return;
  }
  await requireUser(req);
  if (req.method === 'POST') {
    const b = body<{ prices: PricePoint[] }>(req);
    const ok = (b.prices ?? []).filter(p => INSTR.test(String(p.instrument)) && /^\d{4}-\d{2}-\d{2}$/.test(String(p.price_date)) && Number.isFinite(p.close) && p.source_name);
    send(res, 200, { ok: true, ...(await store(ok.map(p => ({ ...p, contract: p.contract ?? 'SPOT' })))) }); return;
  }
  const from = q(req, 'from') || new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10), to = q(req, 'to') || '9999-12-31';
  const names = (q(req, 'series') || '').split(',').filter(Boolean);
  let sq = db().from('commodity_series').select('series,price_date,value').gte('price_date', from).lte('price_date', to).order('price_date');
  if (names.length) sq = sq.in('series', names);
  const series = check(await sq.limit(20000)) as Array<{ series: string; price_date: string; value: number }>;
  const prices = check(await db().from('commodity_prices').select('instrument,contract,price_date,open,close,source_name,source_url,retrieved_at').gte('price_date', from).lte('price_date', to).order('price_date').limit(20000));
  // Format multi-tracé : une colonne par série, alignée sur les dates
  const dates = [...new Set(series.map(x => x.price_date))].sort(), cols: Record<string, Array<number | null>> = {};
  const idx = new Map(dates.map((d, i) => [d, i]));
  series.forEach(x => { (cols[x.series] ??= Array(dates.length).fill(null))[idx.get(x.price_date)!] = x.value; });
  send(res, 200, { dates, series: cols, prices });
});
