/* POST /api/v1/trading/mt-sync : réception des données envoyées par l'EA MetaTrader (MT4/MT5).
   Authentification par compte : en-tête X-Override-Key (clé générée dans OVERRIDE.DESK, stockée hachée). */
import { handler, header, body, send, HttpError, type Req, type Res } from '../../../lib/http.js';
import { db, check } from '../../../lib/supabase.js';
import { sha256, sameHash } from '../../../lib/crypto.js';
import { ingestMt } from '../../../lib/sync.js';
import type { MtSyncPayload } from '../../../types/models.js';

export function validate(p: MtSyncPayload): string | null {
  if (!p?.account || p.account.login == null || !p.account.currency) return 'account.login et account.currency requis';
  if (!Number.isFinite(p.account.balance) || !Number.isFinite(p.account.equity)) return 'account.balance et account.equity numériques requis';
  if (!Array.isArray(p.positions)) return 'positions doit être un tableau';
  for (const x of p.positions) if (!x.symbol || !['buy', 'sell'].includes(x.side) || !Number.isFinite(x.volume)) return 'position invalide (symbol, side buy/sell, volume)';
  for (const x of p.history ?? []) if (!x.symbol || !['buy', 'sell'].includes(x.side) || !Number.isFinite(x.profit) || !x.closed_at) return 'historique invalide (symbol, side, profit, closed_at)';
  return null;
}
export default handler(async (req: Req, res: Res) => {
  if (req.method !== 'POST') throw new HttpError(405, 'POST attendu');
  const key = header(req, 'x-override-key');
  if (!key) throw new HttpError(401, 'En-tête X-Override-Key manquant');
  const p = body<MtSyncPayload>(req), err = validate(p);
  if (err) throw new HttpError(400, err);
  const rows = check(await db().from('trading_accounts').select('id,user_id,webhook_key_hash').eq('login', String(p.account.login)).eq('platform', p.account.platform));
  const acc = (rows as Array<{ id: string; user_id: string; webhook_key_hash: string | null }>).find(r => r.webhook_key_hash && sameHash(r.webhook_key_hash, sha256(key)));
  if (!acc) throw new HttpError(403, 'Clé inconnue pour ce compte');
  const r = await ingestMt(acc.id, acc.user_id, p);
  send(res, 200, { ok: true, account_id: acc.id, ...r });
});
