/* /api/v1/trading/accounts
   GET  : comptes de trading de l'utilisateur, positions ouvertes, historique (option ?start_date&end_date)
   POST : {platform, login, server, broker, account_type, currency} crée ou met à jour un compte et renvoie une clé d'EA (affichée une seule fois)
   DELETE ?id= : supprime un compte */
import { handler, body, send, q, HttpError, type Req, type Res } from '../../../lib/http.ts';
import { db, check, requireUser } from '../../../lib/supabase.ts';
import { sha256, newKey } from '../../../lib/crypto.ts';

export default handler(async (req: Req, res: Res) => {
  const uid = await requireUser(req), s = db();
  if (req.method === 'GET') {
    const accounts = check(await s.from('trading_accounts').select('id,platform,login,server,broker,account_type,currency,balance,equity,margin,free_margin,leverage,status,last_sync_at,last_error').eq('user_id', uid));
    const positions = check(await s.from('active_trades').select('*').eq('user_id', uid));
    let h = s.from('trade_history').select('*').eq('user_id', uid).order('closed_at', { ascending: false }).limit(2000);
    if (q(req, 'start_date')) h = h.gte('closed_at', q(req, 'start_date'));
    if (q(req, 'end_date')) h = h.lte('closed_at', q(req, 'end_date') + 'T23:59:59Z');
    send(res, 200, { accounts, positions, history: check(await h) }); return;
  }
  if (req.method === 'POST') {
    const b = body<{ platform: string; login: string; server?: string; broker?: string; account_type?: string; currency?: string }>(req);
    if (!['MT4', 'MT5', 'STT'].includes(b.platform) || !b.login) throw new HttpError(400, 'platform (MT4, MT5, STT) et login requis');
    const key = newKey();
    const row = check(await s.from('trading_accounts').upsert({ user_id: uid, platform: b.platform, login: String(b.login), server: b.server ?? null, broker: b.broker ?? null,
      account_type: b.account_type ?? 'Réel', currency: b.currency ?? 'EUR', webhook_key_hash: sha256(key) }, { onConflict: 'user_id,platform,login,server' }).select('id').single());
    send(res, 200, { ok: true, account: row, ea_key: key, note: 'Copiez cette clé dans les paramètres de l\'EA : elle ne sera plus affichée.' }); return;
  }
  if (req.method === 'DELETE') { check(await s.from('trading_accounts').delete().eq('user_id', uid).eq('id', q(req, 'id'))); send(res, 200, { ok: true }); return; }
  throw new HttpError(405, 'Méthode non prise en charge');
});
