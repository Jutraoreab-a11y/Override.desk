/* GET /api/v1/refresh?px=stocks/aapl,quote/epa/MC (réécrit vers api/v1/ai/market-parser?op=refresh : limite de 12 fonctions du plan Hobby)
   Mise à jour « Tout mettre à jour » hors de l'application Claude : le serveur relit des sources publiques, sans IA et sans compte.
   - changes de référence de la BCE (XML quotidien) ;
   - cours de clôture des titres (données JSON publiques de stockanalysis.com, 20 titres au plus) ;
   - stocks commerciaux de brut hebdomadaires de l'EIA (série officielle WCESTUS1) ;
   - variation API et consensus (calendrier Investing.com), si la page répond au serveur.
   Réponse mise en cache 15 minutes par Vercel : une rafale de clics ne relit pas les sources. */
import { send, q, type Req, type Res } from './http.js';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 FOMO.DESK';
const get = async (u: string, ms = 9000): Promise<string> => {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: '*/*' }, signal: c.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); }
  finally { clearTimeout(t); }
};
/** Décodage du format « devalue » des pages SvelteKit (__data.json). */
export function devalue(j: { nodes?: Array<{ type?: string; data?: unknown[] } | null> }): unknown {
  const n = (j.nodes || []).find(x => x && x.type === 'data'); if (!n || !Array.isArray(n.data)) throw new Error('format');
  const D = n.data, memo = new Map<number, unknown>();
  const R = (i: number): unknown => {
    if (i === -1) return undefined; if (memo.has(i)) return memo.get(i); const v = D[i];
    if (Array.isArray(v)) { const o: unknown[] = []; memo.set(i, o); v.forEach(k => o.push(R(k as number))); return o; }
    if (v && typeof v === 'object') { const o: Record<string, unknown> = {}; memo.set(i, o); for (const k in v as object) o[k] = R((v as Record<string, number>)[k]); return o; }
    return v;
  };
  return R(0);
}
/** Dernière clôture d'un historique stockanalysis décodé. */
export function lastClose(o: unknown): { c: number; t: string } | null {
  const rows = (o as { data?: { data?: Array<{ t: string; c: number }> } })?.data?.data;
  if (!Array.isArray(rows) || !rows.length) return null;
  const s = [...rows].filter(r => r && typeof r.c === 'number' && r.c > 0).sort((a, b) => (a.t < b.t ? -1 : 1)); const l = s[s.length - 1];
  return l ? { c: l.c, t: l.t } : null;
}
/** XML quotidien de la BCE : date et taux pour 1 euro. */
export function ecbRates(xml: string): { date: string; rates: Record<string, number> } | null {
  const d = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/); if (!d) return null; const rates: Record<string, number> = {};
  for (const m of xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)) rates[m[1]] = +m[2];
  return Object.keys(rates).length ? { date: d[1], rates } : null;
}
/** Page « LeafHandler » de l'EIA : semaines (vendredi) et niveaux en milliers de barils. */
export function eiaWeekly(html: string): Array<{ wk: string; lvl: number }> {
  const out: Array<{ wk: string; lvl: number }> = [];
  for (const row of html.split(/<tr[\s>]/i)) {
    const ym = row.match(/(\d{4})-([A-Z][a-z]{2})/); if (!ym) continue;
    for (const m of row.matchAll(/class="B5">(\d{2})\/(\d{2})(?:&nbsp;)?<\/td>\s*<td class="B3">([\d,]+)/g)) {
      const mo = +m[1], y = +ym[1] + (ym[2] === 'Jan' && mo === 12 ? -1 : 0);
      out.push({ wk: `${y}-${m[1]}-${m[2]}`, lvl: +m[3].replace(/,/g, '') / 1000 });
    }
  }
  return out.sort((a, b) => (a.wk < b.wk ? -1 : 1));
}
/** Historique d'un calendrier Investing.com, texte brut : date, réel et prévision (millions de barils). */
export function investingRows(txt: string): Array<{ d: string; a: number; f: number | null }> {
  const t = txt.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' '), o: Array<{ d: string; a: number; f: number | null }> = [];
  for (const m of t.matchAll(/([A-Z][a-z]{2} \d{1,2}, \d{4})(?: \([A-Z][a-z]{2}\))? (\d{1,2}:\d{2}) (-?\d+\.\d+)M (-?\d+\.\d+)M?/g)) {
    const d = new Date(m[1] + ' 12:00 UTC'); if (!isNaN(+d)) o.push({ d: d.toISOString().slice(0, 10), a: +m[3], f: +m[4] });
  }
  return o;
}
const PX = /^(stocks\/[a-z0-9.\-]{1,12}|quote\/[a-z]{2,8}\/[A-Za-z0-9.\-]{1,14})$/;
export async function refreshRoute(req: Req, res: Res): Promise<void> {
  const px = String(q(req, 'px') || '').split(',').map(s => s.trim().replace(/^\/|\/$/g, '')).filter(s => PX.test(s)).slice(0, 20);
  const want = new Set(String(q(req, 'only') || 'fx,px,eia,api').split(','));
  const err: Record<string, string> = {}, out: Record<string, unknown> = { at: new Date().toISOString(), err };
  const tasks: Array<Promise<void>> = [];
  if (want.has('fx')) tasks.push(get('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml').then(x => { const r = ecbRates(x); if (r) out.fx = { ...r, src: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml' }; else err.fx = 'XML BCE illisible'; }).catch(e => { err.fx = String(e.message || e); }));
  if (want.has('eia')) tasks.push(get('https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=WCESTUS1&f=W').then(h => { const w = eiaWeekly(h).slice(-8); if (w.length) out.eia = { w, src: 'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=WCESTUS1&f=W' }; else err.eia = 'série EIA illisible'; }).catch(e => { err.eia = String(e.message || e); }));
  if (want.has('api')) tasks.push(Promise.all([get('https://www.investing.com/economic-calendar/api-weekly-crude-stock-656'), get('https://www.investing.com/economic-calendar/eia-crude-oil-inventories-75')])
    .then(([a, e]) => { const A = investingRows(a), E = investingRows(e); if (A.length || E.length) out.cal = { api: A.slice(0, 8), eia: E.slice(0, 8), src: 'investing.com' }; else err.api = 'calendrier illisible'; })
    .catch(e => { err.api = 'calendrier Investing.com inaccessible depuis le serveur (' + String(e.message || e) + ')'; }));
  if (want.has('px') && px.length) {
    const prices: Record<string, { c: number; t: string }> = {}; out.prices = prices;
    tasks.push(Promise.all(px.map(p => get(`https://stockanalysis.com/${p}/history/__data.json?x-sveltekit-invalidated=001`)
      .then(t => { const l = lastClose(devalue(JSON.parse(t))); if (l) prices[p] = l; else err['px:' + p] = 'historique vide'; })
      .catch(e => { err['px:' + p] = String(e.message || e); }))).then(() => undefined));
  }
  await Promise.all(tasks);
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=600');
  send(res, 200, out);
}
