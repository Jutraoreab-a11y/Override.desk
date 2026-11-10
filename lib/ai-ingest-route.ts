/* Ingestion IA modulaire et cache-first (v8), servie par la fonction api/v1/ai/market-parser
   (limite de 12 fonctions du plan Vercel Hobby) ; l'URL publique /api/v1/ai/ingest est conservée par réécriture (vercel.json).
   GET  /api/v1/ai/ingest?module=bp|an|cm&subject=…   lecture de la dernière extraction en base : 0 jeton, jamais d'appel à l'API Anthropic
   POST /api/v1/ai/ingest {module, subject, trigger: 'recalc'|'init', url?, force?}
        sert le cache s'il est valide ; sinon lit la source, appelle Claude avec un schéma JSON strict (outil forcé),
        vérifie les extraits cités et stocke le résultat (horodatage, indice de confiance, jetons consommés). */
import { body, send, q, HttpError, type Req, type Res } from './http.ts';
import { db, check, requireUser } from './supabase.ts';
import { htmlToText } from './html.ts';
import { validateIngest, cacheKey, cacheDecision, buildRequest, parseResponse, verifyQuotes, MODULES, type Module } from './ai-ingest.ts';

const fail = (e: unknown): never => { const x = e as { code?: number; message?: string }; throw new HttpError(x.code || 500, x.message || 'Erreur'); };
async function latest(uid: string, key: string) {
  const r = await db().from('ai_sources').select('*').eq('user_id', uid).eq('cache_key', key).order('timestamp_retrieved', { ascending: false }).limit(1);
  return (check(r) as Array<Record<string, unknown>>)[0] ?? null;
}
export async function ingestRoute(req: Req, res: Res): Promise<void> {
  const uid = await requireUser(req);
  if (req.method === 'GET') {
    const m = q(req, 'module') as Module, subject = q(req, 'subject');
    if (!MODULES.includes(m) || !subject) throw new HttpError(400, 'module (bp, an, cm) et subject requis');
    const rec = await latest(uid, cacheKey(m, subject)), d = cacheDecision(rec as { timestamp_retrieved: string } | null, m, 'init', false);
    return send(res, 200, { ok: true, cached: !!rec, stale: d.stale, age_h: d.ageH, record: rec, tokens: 0 });
  }
  if (req.method !== 'POST') throw new HttpError(405, 'GET ou POST');
  let v: ReturnType<typeof validateIngest>; try { v = validateIngest(body(req)); } catch (e) { return fail(e); }
  const key = cacheKey(v.module, v.subject), rec = await latest(uid, key), d = cacheDecision(rec as { timestamp_retrieved: string } | null, v.module, v.trigger, v.force);
  if (d.serve) return send(res, 200, { ok: true, cached: true, stale: d.stale, age_h: d.ageH, record: rec, tokens: 0 });
  const apiKey = process.env.ANTHROPIC_API_KEY; if (!apiKey) throw new HttpError(503, 'ANTHROPIC_API_KEY non configurée (mode simulation)');
  if (!v.url) throw new HttpError(400, 'url source requise pour une nouvelle extraction');
  const page = await fetch(v.url, { headers: { 'User-Agent': 'OVERRIDE.DESK ingest' } });
  if (!page.ok) throw new HttpError(502, `Source HTTP ${page.status}`);
  const text = htmlToText(await page.text());
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(buildRequest(v.module, model, v.subject, text, v.url)) });
  if (!r.ok) throw new HttpError(502, `API Claude HTTP ${r.status}`);
  let p: ReturnType<typeof parseResponse>; try { p = parseResponse(await r.json(), v.module); } catch (e) { return fail(e); }
  const ver = verifyQuotes(p.payload, text, p.confidence);
  const row = { user_id: uid, metric: key, module: v.module, subject: v.subject, cache_key: key, payload: p.payload, value_numeric: null, value_text: null,
    source_url: v.url, source_name: new URL(v.url).hostname, quote: null, timestamp_retrieved: new Date().toISOString(), confidence_score: ver.confidence,
    model, trigger: v.trigger, input_tokens: p.tokens.input, output_tokens: p.tokens.output };
  check(await db().from('ai_sources').insert(row));
  send(res, 200, { ok: true, cached: false, record: row, verified: `${ver.verified}/${ver.total}`, tokens: p.tokens.input + p.tokens.output });
}
