/* /api/v1/integrations/brokers : gestionnaire multi-courtiers.
   GET                       : connexions (sans identifiants), positions, liquidités, statut simulation / live
   POST {action:'save', label, broker, credentials} : enregistre les identifiants chiffrés (AES-256-GCM)
   POST {action:'sync'}      : agrégation de toutes les connexions de l'utilisateur (déclenchée à l'ouverture du dashboard)
   POST {action:'sync', id}  : une connexion
   GET ?action=cron          : tâche planifiée, synchronise toutes les connexions de tous les utilisateurs
   DELETE ?id=               : supprime une connexion et ses données */
import { handler, body, send, q, HttpError, type Req, type Res } from '../../../lib/http.ts';
import { db, check, requireUser, isCron, configured } from '../../../lib/supabase.ts';
import { encrypt } from '../../../lib/crypto.ts';
import { syncConnection } from '../../../lib/sync.ts';
import { ADAPTERS, BROKER_MAP } from '../../../lib/brokers/index.ts';
import type { BrokerCredentials, BrokerId } from '../../../types/models.ts';

type Conn = { id: string; user_id: string; broker: BrokerId; credentials_enc: string | null };
export default handler(async (req: Req, res: Res) => {
  if (req.method === 'GET' && q(req, 'action') === 'catalog') {
    send(res, 200, { backend: configured(), catalog: Object.entries(BROKER_MAP).map(([label, id]) => ({ label, id, api: !!ADAPTERS[id], required: ADAPTERS[id]?.required ?? [] })) }); return;
  }
  if (req.method === 'GET' && q(req, 'action') === 'cron') {
    if (!isCron(req)) throw new HttpError(401, 'Tâche planifiée non autorisée');
    const all = check(await db().from('broker_connections').select('id,user_id,broker,credentials_enc').not('credentials_enc', 'is', null)) as Conn[];
    send(res, 200, { ok: true, results: await Promise.all(all.map(c => syncConnection(c))) }); return;
  }
  const uid = await requireUser(req), s = db();
  if (req.method === 'GET') {
    const connections = check(await s.from('broker_connections').select('id,broker,label,status,last_sync_at,last_error,created_at').eq('user_id', uid));
    const positions = check(await s.from('portfolio_positions').select('*').eq('user_id', uid));
    const cash = check(await s.from('cash_balances').select('*').eq('user_id', uid));
    send(res, 200, { connections, positions, cash }); return;
  }
  if (req.method === 'POST') {
    const b = body<{ action: 'save' | 'sync'; id?: string; label?: string; broker?: BrokerId; credentials?: BrokerCredentials }>(req);
    if (b.action === 'save') {
      const id = (b.broker ?? BROKER_MAP[b.label ?? '']) as BrokerId | undefined;
      if (!id || !b.label) throw new HttpError(400, 'label et broker requis');
      const ad = ADAPTERS[id];
      if (ad) { const miss = ad.required.filter(k => { const v = b.credentials?.[k]; return Array.isArray(v) ? !v.length : !v; }); if (miss.length) throw new HttpError(400, 'Champs manquants : ' + miss.join(', ')); }
      const row = check(await s.from('broker_connections').upsert({ user_id: uid, broker: id, label: b.label, credentials_enc: b.credentials ? encrypt(JSON.stringify(b.credentials)) : null,
        status: 'simulation', last_error: null }, { onConflict: 'user_id,label' }).select('id,user_id,broker,credentials_enc').single()) as Conn;
      const r = ad && row.credentials_enc ? await syncConnection(row) : { ok: false, error: 'import CSV uniquement' };
      send(res, 200, { ok: true, id: row.id, sync: r }); return;
    }
    if (b.action === 'sync') {
      let sel = s.from('broker_connections').select('id,user_id,broker,credentials_enc').eq('user_id', uid);
      if (b.id) sel = sel.eq('id', b.id);
      const list = check(await sel) as Conn[];
      send(res, 200, { ok: true, results: await Promise.all(list.filter(c => ADAPTERS[c.broker] && c.credentials_enc).map(c => syncConnection(c))) }); return;
    }
    throw new HttpError(400, 'action inconnue');
  }
  if (req.method === 'DELETE') { check(await s.from('broker_connections').delete().eq('user_id', uid).eq('id', q(req, 'id'))); send(res, 200, { ok: true }); return; }
  throw new HttpError(405, 'Méthode non prise en charge');
});
