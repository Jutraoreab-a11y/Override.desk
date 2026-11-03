/* /api/v1/trading/stt-sync : SocialTraderTools.
   POST avec X-Override-Key : réception d'un webhook (même format que mt-sync, platform « STT »).
   GET ?action=pull (tâche planifiée ou utilisateur) : aspiration via STT_API_BASE / STT_API_TOKEN.
   Le contrat exact de l'API SocialTraderTools doit être confirmé avec leur documentation : la correspondance des champs est isolée dans mapStt(). */
import { handler, header, body, send, HttpError, type Req, type Res } from '../../../lib/http.ts';
import { db, check, isCron, requireUser } from '../../../lib/supabase.ts';
import { sha256, sameHash } from '../../../lib/crypto.ts';
import { ingestMt } from '../../../lib/sync.ts';
import { validate } from './mt-sync.ts';
import type { MtSyncPayload } from '../../../types/models.ts';

/** Convertit une réponse STT (compte master ou slave) vers le format commun. À ajuster au contrat réel de l'API. */
export function mapStt(a: Record<string, any>): MtSyncPayload {
  const pos = (a.positions ?? a.open_trades ?? []) as Array<Record<string, any>>, hist = (a.history ?? a.closed_trades ?? []) as Array<Record<string, any>>;
  const side = (v: unknown) => /sell|short/i.test(String(v)) ? 'sell' as const : 'buy' as const;
  return {
    account: { platform: (a.platform === 'MT4' ? 'MT4' : 'MT5'), login: a.login ?? a.account_number, server: a.server, broker: a.broker, currency: a.currency ?? 'USD',
      balance: Number(a.balance), equity: Number(a.equity), margin: a.margin != null ? Number(a.margin) : undefined, free_margin: a.free_margin != null ? Number(a.free_margin) : undefined },
    positions: pos.map(p => ({ ticket: p.ticket ?? p.id, symbol: p.symbol, side: side(p.type ?? p.side), volume: Number(p.volume ?? p.lots), open_price: Number(p.open_price), current_price: Number(p.current_price ?? p.price),
      stop_loss: Number(p.sl ?? p.stop_loss) || undefined, take_profit: Number(p.tp ?? p.take_profit) || undefined, profit: Number(p.profit), swap: Number(p.swap ?? 0) })),
    history: hist.map(h => ({ ticket: h.ticket ?? h.id, symbol: h.symbol, side: side(h.type ?? h.side), volume: Number(h.volume ?? h.lots), open_price: Number(h.open_price), close_price: Number(h.close_price),
      profit: Number(h.profit), commission: Number(h.commission ?? 0), swap: Number(h.swap ?? 0), opened_at: h.open_time, closed_at: h.close_time })),
  };
}
async function accountFor(login: string, key?: string, uid?: string) {
  let sel = db().from('trading_accounts').select('id,user_id,webhook_key_hash').eq('platform', 'STT').eq('login', login);
  if (uid) sel = sel.eq('user_id', uid);
  const rows = check(await sel) as Array<{ id: string; user_id: string; webhook_key_hash: string | null }>;
  return key ? rows.find(r => r.webhook_key_hash && sameHash(r.webhook_key_hash, sha256(key))) : rows[0];
}
export default handler(async (req: Req, res: Res) => {
  if (req.method === 'POST') {
    const key = header(req, 'x-override-key'); if (!key) throw new HttpError(401, 'X-Override-Key manquant');
    const p = mapStt(body<Record<string, any>>(req)), err = validate(p); if (err) throw new HttpError(400, err);
    const acc = await accountFor(String(p.account.login), key); if (!acc) throw new HttpError(403, 'Clé inconnue');
    send(res, 200, { ok: true, ...(await ingestMt(acc.id, acc.user_id, p)) }); return;
  }
  const base = process.env.STT_API_BASE, tok = process.env.STT_API_TOKEN;
  if (!base || !tok) throw new HttpError(503, 'STT_API_BASE et STT_API_TOKEN non configurés (mode simulation)');
  const uid = isCron(req) ? undefined : await requireUser(req);
  const r = await fetch(`${base.replace(/\/$/, '')}/accounts`, { headers: { Authorization: `Bearer ${tok}` } });
  if (!r.ok) throw new HttpError(502, `SocialTraderTools HTTP ${r.status}`);
  const list = await r.json() as Array<Record<string, any>>, out: unknown[] = [];
  for (const a of Array.isArray(list) ? list : []) {
    const p = mapStt(a), acc = await accountFor(String(p.account.login), undefined, uid);
    if (acc && !validate(p)) out.push({ login: p.account.login, ...(await ingestMt(acc.id, acc.user_id, p)) });
  }
  send(res, 200, { ok: true, synced: out });
});
