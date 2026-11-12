/* /api/v1/team/versions : versions partagées, circuit de validation et signature.
   GET ?workspace_id=&module=&project=   : liste (sans les données)      GET ?id=          : une version avec ses données
   GET ?action=verify&id=                : contrôle d'intégrité (empreinte recalculée) et de signature
   POST {action:'create', workspace_id, module, project, label, data}   (analyste, admin)
   POST {action:'submit', id}            (auteur ou admin)                → soumise
   POST {action:'validate', id, comment} (valideur, admin ; jamais l'auteur) → validée et signée
   POST {action:'reject', id, comment}   (valideur, admin)               → rejetée */
import { handler, body, send, q, HttpError, type Req, type Res } from '../../../lib/http.js';
import { db, check, requireUser } from '../../../lib/supabase.js';
import { contentHash, sign, requireRole, roleOf, audit } from '../../../lib/team.js';
import { sameHash } from '../../../lib/crypto.js';

type V = { id: string; workspace_id: string; module: string; project: string; label: string; data?: unknown; content_hash: string; status: string; author_id: string; validated_by: string | null; validated_at: string | null; signature: string | null };
async function load(id: string, withData = false): Promise<V> {
  const v = check(await db().from('plan_versions').select(withData ? '*' : 'id,workspace_id,module,project,label,content_hash,status,author_id,created_at,submitted_at,validated_by,validated_at,signature,comment').eq('id', id).maybeSingle()) as V | null;
  if (!v) throw new HttpError(404, 'Version introuvable'); return v;
}
export function verifyVersion(v: V): { intact: boolean; signed: boolean } {
  const h = contentHash(v.data), intact = sameHash(h, v.content_hash);
  const signed = !!(v.signature && v.validated_by && v.validated_at) && sameHash(sign(v.content_hash, v.validated_by!, new Date(v.validated_at!).toISOString()), v.signature!);
  return { intact, signed };
}
export default handler(async (req: Req, res: Res) => {
  const uid = await requireUser(req), s = db();
  if (req.method === 'GET') {
    const id = q(req, 'id');
    if (id) { const v = await load(id, true); if (!(await roleOf(v.workspace_id, uid))) throw new HttpError(403, 'Accès refusé');
      send(res, 200, q(req, 'action') === 'verify' ? { id, ...verifyVersion(v), status: v.status } : v); return; }
    const ws = q(req, 'workspace_id'); if (!ws) throw new HttpError(400, 'workspace_id requis'); await requireRole(ws, uid, ['admin', 'analyste', 'valideur', 'lecteur']);
    let sq = s.from('plan_versions').select('id,module,project,label,content_hash,status,author_id,created_at,submitted_at,validated_by,validated_at,comment').eq('workspace_id', ws).order('created_at', { ascending: false }).limit(500);
    if (q(req, 'module')) sq = sq.eq('module', q(req, 'module')); if (q(req, 'project')) sq = sq.eq('project', q(req, 'project'));
    send(res, 200, { versions: check(await sq) }); return;
  }
  if (req.method !== 'POST') throw new HttpError(405, 'GET ou POST attendu');
  const b = body<{ action: string; id?: string; workspace_id?: string; module?: string; project?: string; label?: string; data?: unknown; comment?: string }>(req);
  if (b.action === 'create') {
    const ws = String(b.workspace_id || ''); await requireRole(ws, uid, ['admin', 'analyste']);
    if (!['bp', 'an', 'lbo'].includes(String(b.module))) throw new HttpError(400, 'Module inconnu');
    if (b.data === undefined || b.data === null) throw new HttpError(400, 'Données de la version requises');
    const row = { workspace_id: ws, module: b.module, project: String(b.project || 'Projet'), label: String(b.label || 'Version'), data: b.data, content_hash: contentHash(b.data), author_id: uid };
    const v = check(await s.from('plan_versions').insert(row).select('id,content_hash').single()) as { id: string; content_hash: string };
    await audit({ workspace_id: ws, user_id: uid, module: b.module, path: 'version', new_value: { label: row.label, hash: v.content_hash }, mode: 'création', version_id: v.id });
    send(res, 200, v); return;
  }
  const v = await load(String(b.id || ''), b.action === 'validate'), now = new Date().toISOString();
  if (b.action === 'submit') {
    const r = await requireRole(v.workspace_id, uid, ['admin', 'analyste']);
    if (v.author_id !== uid && r !== 'admin') throw new HttpError(403, 'Seul l\'auteur ou un administrateur soumet une version');
    if (!['brouillon', 'rejetee'].includes(v.status)) throw new HttpError(409, `Version ${v.status} : soumission impossible`);
    check(await s.from('plan_versions').update({ status: 'soumise', submitted_at: now }).eq('id', v.id));
    await audit({ workspace_id: v.workspace_id, user_id: uid, module: v.module, path: 'version.statut', old_value: v.status, new_value: 'soumise', mode: 'soumission', version_id: v.id });
    send(res, 200, { ok: true, status: 'soumise' }); return;
  }
  if (b.action === 'validate' || b.action === 'reject') {
    await requireRole(v.workspace_id, uid, ['admin', 'valideur']);
    if (v.author_id === uid) throw new HttpError(403, 'Règle des quatre yeux : l\'auteur ne peut pas valider sa propre version');
    if (v.status !== 'soumise') throw new HttpError(409, `Version ${v.status} : seule une version soumise peut être ${b.action === 'validate' ? 'validée' : 'rejetée'}`);
    if (b.action === 'reject') {
      check(await s.from('plan_versions').update({ status: 'rejetee', comment: String(b.comment || '') }).eq('id', v.id));
      await audit({ workspace_id: v.workspace_id, user_id: uid, module: v.module, path: 'version.statut', old_value: 'soumise', new_value: 'rejetee', mode: 'rejet : ' + String(b.comment || ''), version_id: v.id });
      send(res, 200, { ok: true, status: 'rejetee' }); return;
    }
    if (!sameHash(contentHash(v.data), v.content_hash)) throw new HttpError(409, 'Empreinte incohérente : les données ont changé depuis la création de la version');
    const signature = sign(v.content_hash, uid, now);
    check(await s.from('plan_versions').update({ status: 'validee', validated_by: uid, validated_at: now, signature, comment: String(b.comment || '') }).eq('id', v.id));
    await audit({ workspace_id: v.workspace_id, user_id: uid, module: v.module, path: 'version.statut', old_value: 'soumise', new_value: 'validee', mode: 'validation signée', version_id: v.id });
    send(res, 200, { ok: true, status: 'validee', signature, content_hash: v.content_hash, validated_at: now }); return;
  }
  throw new HttpError(400, 'Action inconnue');
});
