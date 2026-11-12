/* /api/v1/team/workspaces : espaces partagés et rôles.
   GET                                   : mes espaces, mon rôle, les membres (et rattachement des invitations à mon e-mail)
   POST {action:'create', name}          : crée un espace, le créateur en est administrateur
   POST {action:'invite', workspace_id, email, role}   (admin)
   POST {action:'role', workspace_id, user_id, role}   (admin ; au moins un administrateur doit rester)
   POST {action:'remove', workspace_id, user_id}       (admin) */
import { handler, body, send, HttpError, type Req, type Res } from '../../../lib/http.js';
import { db, check, requireUserInfo } from '../../../lib/supabase.js';
import { ROLES, requireRole, audit, type Role } from '../../../lib/team.js';

export default handler(async (req: Req, res: Res) => {
  const me = await requireUserInfo(req), s = db();
  if (req.method === 'GET') {
    if (me.email) { // invitations en attente → adhésion
      const inv = check(await s.from('workspace_invites').select('workspace_id,role').eq('email', me.email)) as Array<{ workspace_id: string; role: Role }>;
      for (const i of inv) {
        check(await s.from('workspace_members').upsert({ workspace_id: i.workspace_id, user_id: me.id, email: me.email, role: i.role }, { onConflict: 'workspace_id,user_id' }));
        check(await s.from('workspace_invites').delete().eq('workspace_id', i.workspace_id).eq('email', me.email));
        await audit({ workspace_id: i.workspace_id, user_id: me.id, path: 'membres', new_value: { email: me.email, role: i.role }, mode: 'invitation acceptée' });
      }
    }
    const mine = check(await s.from('workspace_members').select('workspace_id,role').eq('user_id', me.id)) as Array<{ workspace_id: string; role: Role }>;
    const ids = mine.map(m => m.workspace_id);
    const names = ids.length ? check(await s.from('workspaces').select('id,name').in('id', ids)) as Array<{ id: string; name: string }> : [];
    const members = ids.length ? check(await s.from('workspace_members').select('workspace_id,user_id,email,role').in('workspace_id', ids)) as unknown[] : [];
    send(res, 200, { me, workspaces: mine.map(m => ({ id: m.workspace_id, name: names.find(n => n.id === m.workspace_id)?.name ?? '', role: m.role })), members }); return;
  }
  if (req.method !== 'POST') throw new HttpError(405, 'GET ou POST attendu');
  const b = body<{ action: string; name?: string; workspace_id?: string; email?: string; role?: Role; user_id?: string }>(req);
  if (b.action === 'create') {
    const name = String(b.name || '').trim(); if (!name) throw new HttpError(400, 'Nom de l\'espace requis');
    const w = check(await s.from('workspaces').insert({ name, created_by: me.id }).select('id').single()) as { id: string };
    check(await s.from('workspace_members').insert({ workspace_id: w.id, user_id: me.id, email: me.email, role: 'admin' }));
    await audit({ workspace_id: w.id, user_id: me.id, path: 'espace', new_value: { name }, mode: 'création' });
    send(res, 200, { id: w.id }); return;
  }
  const ws = String(b.workspace_id || ''); if (!ws) throw new HttpError(400, 'workspace_id requis');
  await requireRole(ws, me.id, ['admin']);
  if (b.role && !ROLES.includes(b.role)) throw new HttpError(400, 'Rôle inconnu');
  if (b.action === 'invite') {
    const email = String(b.email || '').trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'E-mail invalide');
    check(await s.from('workspace_invites').upsert({ workspace_id: ws, email, role: b.role || 'analyste', invited_by: me.id }, { onConflict: 'workspace_id,email' }));
    await audit({ workspace_id: ws, user_id: me.id, path: 'membres', new_value: { email, role: b.role || 'analyste' }, mode: 'invitation' });
    send(res, 200, { ok: true }); return;
  }
  const uid = String(b.user_id || ''); if (!uid) throw new HttpError(400, 'user_id requis');
  const admins = check(await s.from('workspace_members').select('user_id').eq('workspace_id', ws).eq('role', 'admin')) as Array<{ user_id: string }>;
  const lastAdmin = admins.length === 1 && admins[0].user_id === uid;
  if (b.action === 'role') {
    if (lastAdmin && b.role !== 'admin') throw new HttpError(409, 'Il doit rester au moins un administrateur');
    check(await s.from('workspace_members').update({ role: b.role }).eq('workspace_id', ws).eq('user_id', uid));
    await audit({ workspace_id: ws, user_id: me.id, path: 'membres.' + uid + '.role', new_value: b.role, mode: 'changement de rôle' });
    send(res, 200, { ok: true }); return;
  }
  if (b.action === 'remove') {
    if (lastAdmin) throw new HttpError(409, 'Il doit rester au moins un administrateur');
    check(await s.from('workspace_members').delete().eq('workspace_id', ws).eq('user_id', uid));
    await audit({ workspace_id: ws, user_id: me.id, path: 'membres.' + uid, mode: 'retrait' });
    send(res, 200, { ok: true }); return;
  }
  throw new HttpError(400, 'Action inconnue');
});
