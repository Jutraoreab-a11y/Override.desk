/* /api/v1/portfolio/nav : valorisations quotidiennes du portefeuille et flux (apports / retraits), base du TWR et du MWR.
   GET                         : historique de l'utilisateur
   POST {date, value, flow?}   : enregistre (ou complète) la valorisation d'un jour */
import { handler, body, send, HttpError, type Req, type Res } from '../../../lib/http.js';
import { db, check, requireUser } from '../../../lib/supabase.js';

export default handler(async (req: Req, res: Res) => {
  const uid = await requireUser(req), s = db();
  if (req.method === 'GET') { send(res, 200, { nav: check(await s.from('portfolio_nav').select('nav_date,value_eur,flow_eur').eq('user_id', uid).order('nav_date')) }); return; }
  if (req.method !== 'POST') throw new HttpError(405, 'GET ou POST attendu');
  const b = body<{ date: string; value: number; flow?: number }>(req);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) || !Number.isFinite(+b.value) || +b.value < 0) throw new HttpError(400, 'date (AAAA-MM-JJ) et value positive attendues');
  check(await s.from('portfolio_nav').upsert({ user_id: uid, nav_date: b.date, value_eur: +b.value, flow_eur: Number.isFinite(+b.flow!) ? +b.flow! : 0 }, { onConflict: 'user_id,nav_date' }));
  send(res, 200, { ok: true });
});
