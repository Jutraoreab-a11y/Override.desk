/* Ingestion IA modulaire et cache-first (v8), servie par la fonction api/v1/ai/market-parser
   (limite de 12 fonctions du plan Vercel Hobby) ; l'URL publique /api/v1/ai/ingest est conservée par réécriture (vercel.json).
   GET  /api/v1/ai/ingest?module=bp|an|cm&subject=…   lecture de la dernière extraction en base : 0 jeton, jamais d'appel à l'API Anthropic
   POST /api/v1/ai/ingest {module, subject, trigger: 'recalc'|'init', url?, force?}
        sert le cache s'il est valide ; sinon lit la source, appelle Claude avec un schéma JSON strict (outil forcé),
        vérifie les extraits cités et stocke le résultat (horodatage, indice de confiance, jetons consommés). */
import { body, send, q, HttpError, type Req, type Res } from './http.js';
import { db, check, requireUser, requireUserInfo } from './supabase.js';
import { htmlToText } from './html.js';
import { validateIngest, cacheKey, cacheDecision, buildRequest, parseResponse, verifyQuotes, companyPages, ddgLinks, pickEngine, validAnthropicKey, cmPages, MODULES, type Module } from './ai-ingest.js';
import { encrypt, decrypt } from './crypto.js';

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
  /* Moteur : clé personnelle de l'utilisateur (BYOK, 0 jeton pour l'infrastructure), sinon clé de l'infrastructure réservée au(x) propriétaire(s) */
  const who = await requireUserInfo(req);
  let eng: ReturnType<typeof pickEngine>; try { eng = pickEngine(await userKey(uid), process.env.ANTHROPIC_API_KEY, who.email, process.env.AI_OWNER_EMAILS); } catch (e) { return fail(e); }
  const apiKey = eng.key;
  /* Société : sans URL fournie, les pages publiques (cours, comptes, ratios) sont déduites du ticker */
  if (!v.urls.length && v.module === 'an') {
    v.urls = companyPages(v.subject).urls;
    /* MarketScreener (comptes et EBITDA les plus complets) : adresse trouvée sur sa page de recherche */
    try { const sr = await fetch('https://www.marketscreener.com/search/?q=' + encodeURIComponent(v.subject.replace(/[.:].*$/, '')), { headers: { 'User-Agent': 'Mozilla/5.0 OVERRIDE.DESK ingest' } });
      const m = sr.ok ? (await sr.text()).match(/\/quote\/stock\/[A-Z0-9\-]+-\d+\//) : null; if (m) v.urls.push('https://www.marketscreener.com' + m[0] + 'finances/'); } catch { /* source facultative */ }
  }
  /* Étude de marché, paramètres LBO : sans adresse fournie, recherche web (DuckDuckGo) puis lecture des trois premiers résultats */
  if (!v.urls.length && (v.module === 'bp' || v.module === 'lbo')) {
    const qy = v.query || (v.module === 'lbo' ? `Euribor 3 mois taux actuel ; multiple EV/EBITDA secteur ${v.subject}` : `taille du marché ${v.subject} chiffre d'affaires croissance`);
    const sr = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(qy), { headers: { 'User-Agent': 'Mozilla/5.0 OVERRIDE.DESK research' } });
    if (sr.ok) v.urls = ddgLinks(await sr.text(), 3);
    if (v.module === 'lbo') v.urls = ['https://www.euribor-rates.eu/fr/taux-euribor-actuels/2/euribor-taux-3-mois/', ...v.urls].slice(0, 4);
  }
  if (!v.urls.length && v.module === 'cm') v.urls = cmPages(v.subject);
  if (!v.urls.length) throw new HttpError(400, 'url source requise pour une nouvelle extraction');
  v.url = v.urls[0];
  const parts: string[] = [];
  for (const u of v.urls) { const page = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 OVERRIDE.DESK ingest' } }); if (!page.ok) throw new HttpError(502, `Source HTTP ${page.status} (${u})`); parts.push(`=== PAGE ${u} ===\n` + htmlToText(await page.text()).slice(0, 20000)); }
  const text = parts.join('\n\n');
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(buildRequest(v.module, model, v.subject, text, v.urls.join(' ; '))) });
  if (!r.ok) throw new HttpError(r.status === 401 ? 401 : 502, r.status === 401 ? (eng.engine === 'byok' ? 'Votre clé Anthropic est refusée : remplacez-la dans Collecte IA' : 'Clé Anthropic du serveur refusée') : `API Claude HTTP ${r.status}`);
  let p: ReturnType<typeof parseResponse>; try { p = parseResponse(await r.json(), v.module); } catch (e) { return fail(e); }
  const ver = verifyQuotes(p.payload, text, p.confidence);
  const row = { user_id: uid, metric: key, module: v.module, subject: v.subject, cache_key: key, payload: p.payload, value_numeric: null, value_text: null,
    source_url: v.url, source_name: new URL(v.url).hostname, quote: null, timestamp_retrieved: new Date().toISOString(), confidence_score: ver.confidence,
    model, trigger: v.trigger, engine: eng.engine, input_tokens: p.tokens.input, output_tokens: p.tokens.output };
  check(await db().from('ai_sources').insert(row));
  send(res, 200, { ok: true, cached: false, engine: eng.engine, record: row, verified: `${ver.verified}/${ver.total}`, tokens: p.tokens.input + p.tokens.output });
}

/* Clé Anthropic personnelle, chiffrée AES-256-GCM (ENCRYPTION_KEY) ; jamais renvoyée au navigateur. */
async function userKey(uid: string): Promise<string | null> {
  const r = await db().from('ai_user_keys').select('enc_key').eq('user_id', uid).limit(1);
  const row = (check(r) as Array<{ enc_key: string }>)[0]; if (!row) return null;
  try { return decrypt(row.enc_key); } catch { return null; }
}
/* GET /api/v1/ai/key : {has, last4, updated_at} · POST {key} : enregistre · DELETE : supprime */
export async function keyRoute(req: Req, res: Res): Promise<void> {
  const uid = await requireUser(req);
  if (req.method === 'GET') {
    const r = await db().from('ai_user_keys').select('last4, updated_at').eq('user_id', uid).limit(1), row = (check(r) as Array<{ last4: string; updated_at: string }>)[0];
    return send(res, 200, { ok: true, has: !!row, last4: row?.last4 ?? null, updated_at: row?.updated_at ?? null, infra: !!process.env.ANTHROPIC_API_KEY });
  }
  if (req.method === 'DELETE') { check(await db().from('ai_user_keys').delete().eq('user_id', uid)); return send(res, 200, { ok: true, has: false }); }
  if (req.method !== 'POST') throw new HttpError(405, 'GET, POST ou DELETE');
  const k = String(body<{ key?: string }>(req).key ?? '').trim();
  if (!validAnthropicKey(k)) throw new HttpError(400, 'Clé Anthropic attendue (sk-ant-…)');
  const row = { user_id: uid, enc_key: encrypt(k), last4: k.slice(-4), updated_at: new Date().toISOString() };
  check(await db().from('ai_user_keys').upsert(row, { onConflict: 'user_id' }));
  send(res, 200, { ok: true, has: true, last4: row.last4, updated_at: row.updated_at });
}
