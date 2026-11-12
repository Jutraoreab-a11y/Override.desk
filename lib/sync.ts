/* Services d'agrégation : ingestion MetaTrader et synchronisation des courtiers. */
import type { MtSyncPayload, BrokerCredentials, BrokerSnapshot } from '../types/models.js';
import { db, check } from './supabase.js';
import { decrypt } from './crypto.js';
import { ADAPTERS } from './brokers/index.js';
import type { BrokerId } from '../types/models.js';
import { fetchEcb } from './macro.js';

/** Garantit un taux BCE pour chaque devise non-euro utilisée (sinon les conversions en euros resteraient vides). */
export async function ensureFx(currencies: string[], f: typeof fetch = fetch): Promise<void> {
  const need = [...new Set(currencies.map(c => c.toUpperCase()).filter(c => c && c !== 'EUR'))];
  if (!need.length) return;
  const have = check(await db().from('fx_rates').select('currency').in('currency', need)) as Array<{ currency: string }>;
  if (need.every(c => have.some(h => h.currency === c))) return;
  const rates = await fetchEcb(f).catch(() => []);
  if (rates.length) check(await db().from('fx_rates').upsert(rates.map(r => ({ ...r, source: 'BCE' })), { onConflict: 'currency,rate_date' }));
}

const iso = (s?: string) => { if (!s) return null; const d = new Date(s.replace(/\./g, '-').replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z')); return isNaN(+d) ? null : d.toISOString(); };

/** Écrit l'état d'un compte MetaTrader : compte, positions ouvertes (remplacées), historique (ajouté sans doublon). */
export async function ingestMt(accountId: string, userId: string, p: MtSyncPayload): Promise<{ positions: number; history: number }> {
  const a = p.account, s = db();
  await ensureFx([a.currency]);
  check(await s.from('trading_accounts').update({ balance: a.balance, equity: a.equity, margin: a.margin ?? null, free_margin: a.free_margin ?? null, leverage: a.leverage ?? null,
    currency: a.currency, server: a.server ?? null, broker: a.broker ?? null, status: 'live', last_sync_at: new Date().toISOString(), last_error: null }).eq('id', accountId));
  check(await s.from('active_trades').delete().eq('account_id', accountId));
  const pos = (p.positions ?? []).map(x => ({ account_id: accountId, user_id: userId, ticket: String(x.ticket), symbol: x.symbol, side: x.side, volume: x.volume,
    open_price: x.open_price ?? null, current_price: x.current_price ?? null, stop_loss: x.stop_loss || null, take_profit: x.take_profit || null, swap: x.swap ?? 0, profit: x.profit ?? 0, opened_at: iso(x.opened_at) }));
  if (pos.length) check(await s.from('active_trades').insert(pos));
  const hist = (p.history ?? []).map(x => ({ account_id: accountId, user_id: userId, ticket: String(x.ticket), symbol: x.symbol, side: x.side, volume: x.volume,
    open_price: x.open_price ?? null, close_price: x.close_price ?? null, stop_loss: x.stop_loss || null, take_profit: x.take_profit || null,
    commission: x.commission ?? 0, swap: x.swap ?? 0, profit: x.profit, opened_at: iso(x.opened_at), closed_at: iso(x.closed_at) })).filter(h => h.closed_at);
  if (hist.length) check(await s.from('trade_history').upsert(hist, { onConflict: 'account_id,ticket', ignoreDuplicates: true }));
  check(await s.from('cash_balances').delete().eq('account_id', accountId));
  if (a.free_margin != null) check(await s.from('cash_balances').insert({ account_id: accountId, user_id: userId, currency: a.currency, amount: a.free_margin, updated_at: new Date().toISOString() }));
  return { positions: pos.length, history: hist.length };
}

/** Écrit un instantané de courtier. Les positions « live » remplacent toute valeur forcée (override) de la même plateforme. */
export async function writeSnapshot(connId: string, userId: string, snap: BrokerSnapshot): Promise<number> {
  const s = db(), now = new Date().toISOString();
  await ensureFx([...snap.positions.map(p => p.currency), ...snap.cash.map(c => c.currency)]);
  check(await s.from('portfolio_positions').delete().eq('connection_id', connId));
  if (snap.positions.length) check(await s.from('portfolio_positions').insert(snap.positions.map(p => ({ user_id: userId, connection_id: connId, asset_class: p.asset_class, symbol: p.symbol, name: p.name ?? null,
    quantity: p.quantity, avg_cost: p.avg_cost, last_price: p.last_price, currency: p.currency, stop_loss: p.stop_loss ?? null, take_profit: p.take_profit ?? null, source: 'live', updated_at: now }))));
  check(await s.from('cash_balances').delete().eq('connection_id', connId));
  if (snap.cash.length) check(await s.from('cash_balances').insert(snap.cash.map(c => ({ user_id: userId, connection_id: connId, currency: c.currency, amount: c.amount, updated_at: now }))));
  if (snap.realized?.length) check(await s.from('realized_pnl').upsert(snap.realized.map(r => ({ user_id: userId, connection_id: connId, ...r })), { onConflict: 'connection_id,external_id', ignoreDuplicates: true }));
  return snap.positions.length;
}
/** Synchronise une connexion : déchiffre les identifiants, appelle l'adaptateur, écrit, met à jour le statut. */
export async function syncConnection(conn: { id: string; user_id: string; broker: BrokerId; credentials_enc: string | null }, f: typeof fetch = fetch) {
  const s = db(), ad = ADAPTERS[conn.broker];
  try {
    if (!ad) throw new Error('Pas d\'API officielle : import CSV uniquement');
    if (!conn.credentials_enc) throw new Error('Identifiants non renseignés');
    const creds = JSON.parse(decrypt(conn.credentials_enc)) as BrokerCredentials;
    const n = await writeSnapshot(conn.id, conn.user_id, await ad.fetchSnapshot(creds, f));
    check(await s.from('broker_connections').update({ status: 'live', last_sync_at: new Date().toISOString(), last_error: null }).eq('id', conn.id));
    return { id: conn.id, ok: true, positions: n };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await s.from('broker_connections').update({ status: 'error', last_error: msg }).eq('id', conn.id);
    return { id: conn.id, ok: false, error: msg };
  }
}
