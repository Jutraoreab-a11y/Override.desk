/* GET /api/v1/sa?p=/stocks/aapl/financials/income-statement (réécrit vers api/v1/ai/market-parser?op=sa) — v8.37
   Lecture serveur des données publiques de stockanalysis.com (__data.json) pour créer une analyse hors de l'application Claude.
   Seuls les chemins /stocks/… et /quote/… sont acceptés. Cache Vercel 6 heures. */
import { send, q, type Req, type Res } from './http.js';
export async function saRoute(req: Req, res: Res): Promise<void> {
  const p = String(q(req, 'p') || '');
  if (!/^\/(stocks|quote)\/[A-Za-z0-9.\-\/]{1,80}$/.test(p) || p.includes('..')) return send(res, 400, { error: 'chemin refusé' });
  try { const r = await fetch(`https://stockanalysis.com${p}/__data.json?x-sveltekit-invalidated=001`, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', Accept: 'application/json' } });
    if (!r.ok) return send(res, 502, { error: 'stockanalysis HTTP ' + r.status });
    res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=21600');
    res.status(200).end(await r.text()); }
  catch (e) { send(res, 502, { error: String((e as Error).message || e) }); }
}
