/* /api/v1/team/audit : journal d'audit serveur (ajout seul).
   POST {workspace_id?, events:[{module, path, old, new, mode}]} : envoi du journal des forçages du navigateur
   GET ?workspace_id=                                           : 500 derniers événements de l'espace (ou les miens sans espace) */
import { handler, body, send, q, HttpError, type Req, type Res } from '../../../lib/http.js';
import { db, check, requireUser } from '../../../lib/supabase.js';
import { requireRole } from '../../../lib/team.js';

export default handler(async (req: Req, res: Res) => {
  const uid = await requireUser(req), s = db();
  if (req.method === 'GET') {
    const ws = q(req, 'workspace_id');
    let sq = s.from('audit_events').select('id,workspace_id,user_id,at,module,path,old_value,new_value,mode,version_id').order('at', { ascending: false }).limit(500);
    if (ws) { await requireRole(ws, uid, ['admin', 'analyste', 'valideur', 'lecteur']); sq = sq.eq('workspace_id', ws); } else sq = sq.is('workspace_id', null).eq('user_id', uid);
    send(res, 200, { events: check(await sq) }); return;
  }
  if (req.method !== 'POST') throw new HttpError(405, 'GET ou POST attendu');
  const b = body<{ workspace_id?: string; events: Array<{ module?: string; path: string; old?: unknown; new?: unknown; mode?: string }> }>(req);
  const ws = b.workspace_id || null; if (ws) await requireRole(ws, uid, ['admin', 'analyste', 'valideur']);
  const ev = (b.events || []).slice(0, 500).filter(e => e && typeof e.path === 'string' && e.path.length <= 300)
    .map(e => ({ workspace_id: ws, user_id: uid, module: e.module ? String(e.module).slice(0, 20) : null, path: e.path, old_value: e.old ?? null, new_value: e.new ?? null, mode: String(e.mode || 'saisie').slice(0, 80) }));
  if (ev.length) check(await s.from('audit_events').insert(ev));
  send(res, 200, { ok: true, inserted: ev.length });
});
