/* GET /api/v1/fundamentals?ticker=XXX (réécrit vers api/v1/ai/market-parser?op=fundamentals : limite de 12 fonctions du plan Hobby)
   Comptes publiés des cinq derniers exercices d'une société cotée aux États-Unis, depuis la SEC (sans IA, 0 jeton),
   et cours récent si TIINGO_API_KEY est configurée. Le résultat est stocké dans ai_sources (module an, confiance 1) : la
   lecture suivante du même ticker se fait depuis la base. Hors États-Unis : 404 explicite, le front propose l'ingestion IA. */
import { send, q, HttpError, type Req, type Res } from './http.js';
import { db, check, requireUser } from './supabase.js';
import { toStatements, findCik, type CompanyFacts } from './sec.js';
import { cacheKey } from './ai-ingest.js';

const UA = () => process.env.SEC_USER_AGENT || 'OVERRIDE.DESK contact@override-desk.app';
export async function fundamentalsRoute(req: Req, res: Res): Promise<void> {
  const uid = await requireUser(req);
  const t = String(q(req, 'ticker') || '').trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,12}$/.test(t)) throw new HttpError(400, 'ticker invalide');
  const key = cacheKey('an', t);
  const cached = (check(await db().from('ai_sources').select('payload,timestamp_retrieved,source_url').eq('user_id', uid).eq('cache_key', key).eq('source_name', 'SEC EDGAR')
    .order('timestamp_retrieved', { ascending: false }).limit(1)) as Array<{ payload: unknown; timestamp_retrieved: string; source_url: string }>)[0];
  if (cached && Date.now() - Date.parse(cached.timestamp_retrieved) < 7 * 864e5 && q(req, 'force') !== '1') return send(res, 200, { ok: true, cached: true, ...(cached.payload as object), tokens: 0 });
  const h = { 'User-Agent': UA(), Accept: 'application/json' };
  const lr = await fetch('https://www.sec.gov/files/company_tickers.json', { headers: h }); if (!lr.ok) throw new HttpError(502, 'SEC HTTP ' + lr.status);
  const c = findCik(await lr.json(), t);
  if (!c) throw new HttpError(404, `${t} n'est pas déposé à la SEC (société non américaine) : utiliser l'ingestion IA avec l'URL du rapport annuel`);
  const fr = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${c.cik}.json`, { headers: h }); if (!fr.ok) throw new HttpError(502, 'SEC companyfacts HTTP ' + fr.status);
  const st = toStatements(await fr.json() as CompanyFacts);
  let price: { close: number; date: string } | null = null;
  if (process.env.TIINGO_API_KEY) { try { const pr = await fetch(`https://api.tiingo.com/tiingo/daily/${t}/prices?token=${process.env.TIINGO_API_KEY}`); if (pr.ok) { const j = await pr.json() as Array<{ close: number; date: string }>; const x = j[j.length - 1]; if (x) price = { close: x.close, date: x.date.slice(0, 10) }; } } catch { /* cours facultatif */ } }
  const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${c.cik}&type=10-K`;
  const payload = { ticker: t, title: c.title, cik: c.cik, statements: st, price, source: 'SEC EDGAR (XBRL companyfacts, rapports 10-K)', source_url: url };
  check(await db().from('ai_sources').insert({ user_id: uid, metric: key, module: 'an', subject: t, cache_key: key, payload, source_url: url, source_name: 'SEC EDGAR',
    timestamp_retrieved: new Date().toISOString(), confidence_score: 1, trigger: 'init', input_tokens: 0, output_tokens: 0 }));
  send(res, 200, { ok: true, cached: false, ...payload, tokens: 0 });
}
