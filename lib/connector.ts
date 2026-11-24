/* Connecteur Claude (MCP) : Claude se branche sur FOMO.DESK et répond aux demandes du SaaS avec l'abonnement de l'utilisateur,
   sans clé API Anthropic côté serveur.
   - /api/v1/keys  : clés personnelles du connecteur (GET liste, POST {label} création, DELETE ?id= révocation) ; session requise.
   - /api/v1/jobs  : file des demandes (POST {module, subject, query, instructions, schema} ; GET ?status=done ; POST {action:'ack', ids}).
   - /api/v1/desk  : instantané du bureau (POST {state}) que Claude peut lire.
   - /api/v1/mcp   : serveur MCP (JSON-RPC 2.0 en HTTP, sans session SSE). La clé passe dans l'URL (?key=fdk_…) ou en Bearer.
   Sans base de données configurée, le serveur MCP n'expose que les données publiques (changes, cours, comptes, stocks de brut). */
import { send, q, body, header, HttpError, type Req, type Res } from './http.js';
import { db, check, requireUser, configured } from './supabase.js';
import { sha256, newKey } from './crypto.js';
import { refreshData, companyFiche } from './public-refresh.js';

const VERSION = '8.17';
type Job = { id: string; module: string; subject: string; query: string | null; instructions: string; schema: string | null; status: string; created_at: string; result?: unknown };

/* ---------------- clés du connecteur ---------------- */
export async function keysRoute(req: Req, res: Res): Promise<void> {
  const uid = await requireUser(req), s = db();
  if (req.method === 'GET') return send(res, 200, { keys: check(await s.from('fomodesk_keys').select('id,label,prefix,created_at,last_used_at,revoked_at').eq('user_id', uid).order('created_at', { ascending: false })) });
  if (req.method === 'DELETE') {
    const id = q(req, 'id'); if (!id) throw new HttpError(400, 'id requis');
    check(await s.from('fomodesk_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id).eq('user_id', uid)); return send(res, 200, { ok: true });
  }
  const b = body<{ label?: string }>(req), key = 'fdk_' + newKey(), label = String(b.label || 'Claude').slice(0, 60);
  const row = check(await s.from('fomodesk_keys').insert({ user_id: uid, label, prefix: key.slice(0, 10), key_hash: sha256(key) }).select('id,label,prefix,created_at').single());
  send(res, 201, { ...(row as unknown as Record<string, unknown>), key }); /* la clé n'est montrée qu'une fois : seule son empreinte est conservée */
}
/* ---------------- file des demandes ---------------- */
export async function jobsRoute(req: Req, res: Res): Promise<void> {
  const uid = await requireUser(req), s = db();
  if (req.method === 'GET') {
    const st = q(req, 'status') || 'done';
    return send(res, 200, { jobs: check(await s.from('fomodesk_jobs').select('id,module,subject,status,created_at,done_at,result,error').eq('user_id', uid).eq('status', st).order('created_at').limit(50)) });
  }
  const b = body<{ action?: string; ids?: string[]; module?: string; subject?: string; query?: string; instructions?: string; schema?: string }>(req);
  if (b.action === 'wake') return send(res, 200, await wakeClaude());
  if (b.action === 'ack') { check(await s.from('fomodesk_jobs').update({ status: 'applied' }).in('id', (b.ids || []).slice(0, 50)).eq('user_id', uid)); return send(res, 200, { ok: true }); }
  if (!b.module || !b.subject || !b.instructions) throw new HttpError(400, 'module, subject et instructions requis');
  /* une même demande en attente n'est pas dupliquée */
  const open = check(await s.from('fomodesk_jobs').select('id').eq('user_id', uid).eq('module', b.module).eq('subject', b.subject).in('status', ['pending', 'claimed']).limit(1)) as Array<{ id: string }>;
  if (open.length) return send(res, 200, { id: open[0].id, queued: false });
  const row = check(await s.from('fomodesk_jobs').insert({ user_id: uid, module: b.module, subject: String(b.subject).slice(0, 200), query: b.query || null, instructions: String(b.instructions).slice(0, 4000), schema: b.schema ? String(b.schema).slice(0, 4000) : null, status: 'pending' }).select('id').single()) as { id: string };
  send(res, 201, { id: row.id, queued: true });
}
/* v8.31 : réveil de Claude à chaque demande. La routine Claude Code « FOMO.DESK - traitement automatique des demandes »
   a un déclencheur API (créé sur sa page claude.ai) : son adresse et son jeton vivent dans ROUTINE_FIRE_URL et ROUTINE_FIRE_TOKEN
   (variables Vercel, jamais côté navigateur). Un réveil au plus toutes les 45 s par instance : une salve de demandes = un seul réveil. */
let lastWake = 0;
export async function wakeClaude(): Promise<{ woken: boolean; reason?: string; status?: number }> {
  const url = process.env.ROUTINE_FIRE_URL, tok = process.env.ROUTINE_FIRE_TOKEN;
  if (!url || !tok) return { woken: false, reason: 'réveil non configuré (ROUTINE_FIRE_URL / ROUTINE_FIRE_TOKEN absents) : passage automatique planifié' };
  if (Date.now() - lastWake < 45_000) return { woken: true, reason: 'déjà réveillé il y a moins de 45 s' };
  lastWake = Date.now();
  try {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-beta': process.env.ROUTINE_FIRE_BETA || 'experimental-cc-routine-2026-04-01' },
      body: JSON.stringify({ text: 'Nouvelles demandes FOMO.DESK en attente : traite toute la file maintenant.' }) });
    if (!r.ok) { lastWake = 0; return { woken: false, status: r.status, reason: 'la routine a refusé le réveil (HTTP ' + r.status + ')' }; }
    return { woken: true, status: r.status };
  } catch (e) { lastWake = 0; return { woken: false, reason: 'réveil impossible : ' + (e instanceof Error ? e.message : String(e)) }; }
}
export async function deskRoute(req: Req, res: Res): Promise<void> {
  const uid = await requireUser(req), b = body<{ state?: unknown }>(req), raw = JSON.stringify(b.state ?? null);
  if (raw.length > 900_000) throw new HttpError(413, 'Instantané trop volumineux');
  check(await db().from('fomodesk_desk').upsert({ user_id: uid, state: b.state, updated_at: new Date().toISOString() }));
  send(res, 200, { ok: true, bytes: raw.length });
}

/* ---------------- serveur MCP ---------------- */
const PUBLIC_TOOLS = [
  { name: 'fomo_public_data', description: "Données publiques fraîches relues par FOMO.DESK : taux de change de référence de la BCE, cours de clôture de titres (chemins stockanalysis, ex. stocks/aapl, quote/epa/MC), stocks commerciaux de brut hebdomadaires de l'EIA. Sans compte.",
    inputSchema: { type: 'object', properties: { tickers: { type: 'array', items: { type: 'string' }, description: 'Chemins stockanalysis, 20 au plus' } } } },
  { name: 'fomo_company_fiche', description: "Fiche complète d'une société cotée : comptes 5 ans (CA, EBITDA, EBIT, résultat, BPA, FCF, capex, capitaux propres, actif, dette nette), consensus N+1, date de résultats, cours 6 mois. Source : S&P Global via stockanalysis.com. Ticker au format Yahoo (AAPL, MC.PA, 7203.T).",
    inputSchema: { type: 'object', properties: { ticker: { type: 'string' } }, required: ['ticker'] } },
];
const USER_TOOLS = [
  { name: 'fomo_next_job', description: "Prochaine demande en attente envoyée par FOMO.DESK (recherche d'étude de marché, paramètres LBO, comptes d'une société, cours d'une matière première). Renvoie les instructions et le format JSON attendu, ou « aucune demande ».",
    inputSchema: { type: 'object', properties: {} } },
  { name: 'fomo_submit_job', description: "Renvoie à FOMO.DESK le résultat d'une demande : un objet JSON au format demandé, avec les sources lues (url, extrait cité mot pour mot, chiffre justifié). Le SaaS l'applique à l'ouverture suivante.",
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, result: { type: 'object' }, error: { type: 'string', description: "À remplir si la demande ne peut pas être traitée" } }, required: ['id'] } },
  { name: 'fomo_list_jobs', description: 'Liste les demandes FOMO.DESK par statut (pending, claimed, done, applied, error).',
    inputSchema: { type: 'object', properties: { status: { type: 'string' } } } },
  { name: 'fomo_desk', description: "Instantané du bureau FOMO.DESK de l'utilisateur : titres analysés et leurs chiffres, dossier business plan, dossiers LBO, portefeuille, commodities. À lire avant de répondre à une question sur ses dossiers.",
    inputSchema: { type: 'object', properties: { section: { type: 'string', description: 'an, bp, lbo, pf, cm ou all' } } } },
];
const INSTRUCTIONS = "Tu es connecté à FOMO.DESK. Pour traiter les demandes du SaaS : appelle fomo_next_job ; fais la recherche demandée sur le web en ouvrant les pages (jamais de chiffre de mémoire) ; renvoie le JSON exact demandé avec fomo_submit_job, sources comprises (url et extrait cité mot pour mot) ; recommence jusqu'à « aucune demande ». Pour une question sur les dossiers de l'utilisateur, lis d'abord fomo_desk. Réponds en français.";

async function userFromKey(req: Req): Promise<string | null> {
  const auth = header(req, 'authorization'), k = q(req, 'key') || (auth.startsWith('Bearer fdk_') ? auth.slice(7) : '');
  if (!k) return null; if (!/^fdk_[A-Za-z0-9_-]{20,64}$/.test(k)) throw new HttpError(401, 'Clé de connecteur invalide');
  if (!configured()) return null;
  const r = check(await db().from('fomodesk_keys').select('id,user_id').eq('key_hash', sha256(k)).is('revoked_at', null).limit(1)) as Array<{ id: string; user_id: string }>;
  if (!r.length) throw new HttpError(401, 'Clé de connecteur révoquée ou inconnue : créez-en une dans Paramètres');
  await db().from('fomodesk_keys').update({ last_used_at: new Date().toISOString() }).eq('id', r[0].id);
  return r[0].user_id;
}
const txt = (o: unknown, isError = false) => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o) }], ...(isError ? { isError: true } : {}) });
function pick(state: Record<string, unknown>, sec: string): unknown {
  if (sec === 'all' || !sec) return state; return state[sec] ?? `section « ${sec} » absente de l'instantané`;
}
export async function callTool(uid: string | null, name: string, a: Record<string, unknown>): Promise<unknown> {
  if (name === 'fomo_public_data') return txt(await refreshData((Array.isArray(a.tickers) ? a.tickers : []).map(String), new Set(['fx', 'px', 'eia'])));
  if (name === 'fomo_company_fiche') { const t = String(a.ticker || '').trim(); if (!/^[A-Za-z0-9.\-]{1,16}$/.test(t)) return txt('ticker invalide', true); return txt(await companyFiche(t)); }
  if (!uid) return txt("Outil réservé aux comptes FOMO.DESK : ajoutez ?key=fdk_… (Paramètres > Connecteur Claude) à l'adresse du connecteur.", true);
  const s = db();
  if (name === 'fomo_next_job') {
    const j = (check(await s.from('fomodesk_jobs').select('id,module,subject,query,instructions,schema,status,created_at').eq('user_id', uid).in('status', ['pending', 'claimed']).order('created_at').limit(1)) as Job[])[0];
    if (!j) return txt('aucune demande');
    await s.from('fomodesk_jobs').update({ status: 'claimed', claimed_at: new Date().toISOString() }).eq('id', j.id);
    return txt({ id: j.id, module: j.module, subject: j.subject, piste_de_recherche: j.query, instructions: j.instructions, format_json_attendu: j.schema,
      rappel: 'Ouvre les pages, cite les extraits mot pour mot, renvoie le JSON exact avec fomo_submit_job.' });
  }
  if (name === 'fomo_submit_job') {
    const id = String(a.id || ''); if (!id) return txt('id requis', true);
    const upd = a.error ? { status: 'error', error: String(a.error).slice(0, 1000), done_at: new Date().toISOString() } : { status: 'done', result: a.result ?? null, done_at: new Date().toISOString() };
    if (!a.error && (a.result === undefined || a.result === null)) return txt('result requis (objet JSON au format demandé)', true);
    const r = check(await s.from('fomodesk_jobs').update(upd).eq('id', id).eq('user_id', uid).select('id')) as Array<{ id: string }>;
    return txt(r.length ? 'résultat enregistré : FOMO.DESK l\'appliquera à la prochaine ouverture ou mise à jour' : 'demande introuvable', !r.length);
  }
  if (name === 'fomo_list_jobs') return txt(check(await s.from('fomodesk_jobs').select('id,module,subject,status,created_at,done_at,error').eq('user_id', uid).eq('status', String(a.status || 'pending')).order('created_at').limit(30)));
  if (name === 'fomo_desk') {
    const d = (check(await s.from('fomodesk_desk').select('state,updated_at').eq('user_id', uid).limit(1)) as Array<{ state: Record<string, unknown>; updated_at: string }>)[0];
    if (!d) return txt("aucun instantané : ouvrez FOMO.DESK connecté à votre compte pour l'envoyer", true);
    return txt({ mis_a_jour_le: d.updated_at, donnees: pick(d.state || {}, String(a.section || 'all')) });
  }
  return txt('outil inconnu : ' + name, true);
}
type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
export async function mcpHandle(uid: string | null, m: Rpc): Promise<unknown | undefined> {
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id: m.id ?? null, result }), er = (code: number, message: string) => ({ jsonrpc: '2.0', id: m.id ?? null, error: { code, message } });
  if (!m.method) return er(-32600, 'requête invalide');
  if (m.method.startsWith('notifications/')) return undefined;
  if (m.method === 'initialize') return ok({ protocolVersion: String(m.params?.protocolVersion || '2025-06-18'), capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'FOMO.DESK', version: VERSION }, instructions: INSTRUCTIONS });
  if (m.method === 'ping') return ok({});
  if (m.method === 'tools/list') return ok({ tools: uid ? [...USER_TOOLS, ...PUBLIC_TOOLS] : PUBLIC_TOOLS });
  if (m.method === 'tools/call') {
    const p = m.params || {};
    try { return ok(await callTool(uid, String(p.name || ''), (p.arguments as Record<string, unknown>) || {})); }
    catch (e) { return ok(txt('erreur : ' + (e instanceof Error ? e.message : String(e)), true)); }
  }
  if (m.method === 'resources/list') return ok({ resources: [] });
  if (m.method === 'prompts/list') return ok({ prompts: [] });
  return er(-32601, 'méthode inconnue : ' + m.method);
}
export async function mcpRoute(req: Req, res: Res): Promise<void> {
  if (req.method === 'GET') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'Serveur MCP FOMO.DESK : utilisez POST (JSON-RPC)' }); }
  if (req.method === 'DELETE') { res.status(204).end(); return; }
  const uid = await userFromKey(req), b = body<Rpc | Rpc[]>(req);
  if (Array.isArray(b)) { const out = (await Promise.all(b.map(x => mcpHandle(uid, x)))).filter(x => x !== undefined); if (!out.length) { res.status(202).end(); return; } return send(res, 200, out); }
  const out = await mcpHandle(uid, b); if (out === undefined) { res.status(202).end(); return; }
  send(res, 200, out);
}
