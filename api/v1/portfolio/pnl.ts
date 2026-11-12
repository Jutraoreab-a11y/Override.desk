/* GET /api/v1/portfolio/pnl?start_date=AAAA-MM-JJ&end_date=AAAA-MM-JJ
   PnL latent (à date) et réalisé (sur la période) par portefeuille et classe d'actifs, plus le risque par ligne (SL, TP, RR). */
import { handler, send, q, HttpError, type Req, type Res } from '../../../lib/http.js';
import { requireUser, check, db } from '../../../lib/supabase.js';
import { ensureFx } from '../../../lib/sync.js';
import { createClient } from '@supabase/supabase-js';
import { header } from '../../../lib/http.js';
import type { PnlRow, PositionRisk, RiskSummary } from '../../../types/models.js';

export function summarize(rows: PositionRisk[]): RiskSummary {
  const r = rows.filter(x => x.risk_eur != null).reduce((a, x) => a + (x.risk_eur ?? 0), 0);
  const w = rows.filter(x => x.reward_eur != null).reduce((a, x) => a + (x.reward_eur ?? 0), 0);
  return { risk_eur: r, reward_eur: w, rr: r > 0 ? w / r : null, unprotected: rows.filter(x => x.stop_loss == null).length };
}
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
export default handler(async (req: Req, res: Res) => {
  const uid = await requireUser(req);
  const start = q(req, 'start_date') || '1900-01-01', end = q(req, 'end_date') || new Date().toISOString().slice(0, 10);
  if (!isDate(start) || !isDate(end) || start > end) throw new HttpError(400, 'start_date et end_date au format AAAA-MM-JJ, début avant fin');
  // Requêtes exécutées avec le jeton de l'utilisateur : RLS et auth.uid() s'appliquent.
  const u = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { global: { headers: { Authorization: header(req, 'authorization') } }, auth: { persistSession: false } });
  const ccys = check(await db().from('trading_accounts').select('currency').eq('user_id', uid)) as Array<{ currency: string }>;
  const pccy = check(await db().from('portfolio_positions').select('currency').eq('user_id', uid)) as Array<{ currency: string }>;
  await ensureFx([...ccys, ...pccy].map(x => x.currency));
  const pnl = check(await u.rpc('pnl_summary', { start_date: start, end_date: end })) as PnlRow[];
  const risk = check(await u.from('v_position_risk').select('*')) as PositionRisk[];
  const by = (pf: string) => summarize(risk.filter(x => x.portfolio === pf));
  send(res, 200, { start_date: start, end_date: end, pnl, risk, summary: { Trading: by('Trading'), Placements: by('Placements'), Consolidé: summarize(risk) } });
});
