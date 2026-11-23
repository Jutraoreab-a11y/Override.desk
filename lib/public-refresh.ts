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
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
    for (let i = 0; i < cells.length - 1; i++) {
      const d = cells[i].match(/^(\d{2})\/(\d{2})$/), v = cells[i + 1].replace(/[,\s]/g, '');
      if (!d || !/^\d+(\.\d+)?$/.test(v)) continue;
      const mo = +d[1], y = +ym[1] + (ym[2] === 'Jan' && mo === 12 ? -1 : 0);
      out.push({ wk: `${y}-${d[1]}-${d[2]}`, lvl: +v / 1000 }); i++;
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
export async function refreshData(pxIn: string[], want: Set<string>): Promise<Record<string, unknown>> {
  const px = pxIn.map(s => s.trim().replace(/^\/|\/$/g, '')).filter(s => PX.test(s)).slice(0, 20);
  const err: Record<string, string> = {}, out: Record<string, unknown> = { at: new Date().toISOString(), err };
  const tasks: Array<Promise<void>> = [];
  if (want.has('fx')) tasks.push(get('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml').then(x => { const r = ecbRates(x); if (r) out.fx = { ...r, src: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml' }; else err.fx = 'XML BCE illisible'; }).catch(e => { err.fx = String(e.message || e); }));
  if (want.has('eia')) tasks.push(get('https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=WCESTUS1&f=W').then(h => { const w = eiaWeekly(h).slice(-8); if (w.length) out.eia = { w, src: 'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=WCESTUS1&f=W' }; else err.eia = 'série EIA illisible (' + h.length + ' octets)'; }).catch(e => { err.eia = String(e.message || e); }));
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
  return out;
}
export async function refreshRoute(req: Req, res: Res): Promise<void> {
  const out = await refreshData(String(q(req, 'px') || '').split(','), new Set(String(q(req, 'only') || 'fx,px,eia,api').split(',')));
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=600');
  send(res, 200, out);
}
/* Fiche d'une société : comptes, consensus N+1, agenda et cours, depuis les données publiques de stockanalysis.com */
const EXM: Record<string, string> = { SS: 'sha', SZ: 'she', AS: 'ams', L: 'lon', MC: 'bme', AX: 'asx', PA: 'epa', TW: 'tpe', T: 'tyo', SW: 'swx', TO: 'tsx', KS: 'krx', KQ: 'kosdaq', SR: 'tadawul', F: 'etr', DE: 'etr', HK: 'hkg', MI: 'bit', BR: 'ebr', ST: 'sto', CO: 'cph', HE: 'hel', OL: 'osl', NS: 'nse', BO: 'bom', SA: 'bvmf', MX: 'bmv', JO: 'jse', SI: 'sgx', V: 'tsxv', VI: 'vie', WA: 'wse', IR: 'ise', NZ: 'nzx', IS: 'ist', TA: 'tase', JK: 'idx', BK: 'set', KL: 'klse', LS: 'eli', AT: 'athex' };
export function saPath(tk: string): string | null {
  const m = tk.match(/^(.+)\.([A-Z]+)$/); if (!m) return '/stocks/' + tk.toLowerCase().replace('-', '.');
  const ex = EXM[m[2]]; if (!ex) return null; return `/quote/${ex}/${m[2] === 'HK' ? String(+m[1]) : m[1]}`;
}
type Fin = Record<string, unknown[]> & { fiscalYear: string[] };
export async function companyFiche(tk: string): Promise<Record<string, unknown>> {
  const p = saPath(tk.toUpperCase().replace(/^([A-Z0-9-]+)$/, s => s)); if (!p) throw new Error('place de cotation non couverte');
  const J = async (s: string) => devalue(JSON.parse(await get(`https://stockanalysis.com${p}${s}/__data.json?x-sveltekit-invalidated=001`))) as Record<string, unknown>;
  const M6 = (v: unknown) => typeof v === 'number' ? Math.round(v / 1e4) / 100 : null;
  const inc = await J('/financials/income-statement'), f = inc.financialData as Fin; if (!f) throw new Error('comptes absents');
  const fy = [...new Set(f.fiscalYear.slice(1))].sort().slice(-5);
  const g = (F: Fin | undefined, k: string, cv: (v: number) => number | null = v => v) => fy.map(y => { const i = F && F.fiscalYear ? F.fiscalYear.lastIndexOf(y) : -1, v = i >= 0 && F && F[k] ? F[k][i] : null; return typeof v === 'number' ? cv(v) : null; });
  const safe = async (s: string) => { try { return await J(s); } catch { return null; } };
  const [bal, cf, ov, fc, st] = await Promise.all([safe('/financials/balance-sheet'), safe('/financials/cash-flow-statement'), safe('/financials'), safe('/forecast'), safe('/statistics')]);
  const bf = bal?.financialData as Fin | undefined, cff = cf?.financialData as Fin | undefined;
  const A = ((fc?.estimates as Record<string, unknown> | undefined)?.table as Record<string, unknown> | undefined)?.annual as Fin | undefined;
  const nx = String(+fy[fy.length - 1] + 1), ia = A ? A.fiscalYear.indexOf(nx) : -1, ea = (k: string) => ia >= 0 && A && typeof A[k]?.[ia] === 'number' ? A[k][ia] as number : null;
  const dates = ((st?.dates as Record<string, unknown> | undefined)?.data as Array<{ id: string; value: string }> | undefined) || [];
  return { ticker: tk, source: `https://stockanalysis.com${p}/financials/`, devise_des_comptes: ((ov?.details as Record<string, string> | undefined)?.currency) || 'USD', unite: 'millions',
    exercices: fy, chiffre_affaires: g(f, 'revenue', M6), ebitda: g(f, 'ebitda', M6), ebit: g(f, 'ebit', M6), interets: g(f, 'interestExpense', M6), taux_impot_pct: g(f, 'taxrate', v => Math.round(v * 1000) / 10),
    resultat_net: g(f, 'netinc', M6), bpa_dilue: g(f, 'epsdil'), fcf: g(f, 'fcf', M6), actions_diluees_millions: g(f, 'sharesDiluted', M6),
    actif_total: g(bf, 'assets', M6), capitaux_propres: g(bf, 'equity', M6), dette_nette: g(bf, 'netcash', v => -(M6(v) as number)), capex: g(cff, 'capex', v => -(M6(v) as number)),
    consensus_n1: { exercice: nx, chiffre_affaires: M6(ea('revenue')), bpa: ea('eps'), resultat_operationnel: M6(ea('operatingIncome')), analystes: ea('analysts') },
    objectifs_de_cours: (fc?.priceTargets as unknown) || null, prochaine_publication: dates.find(d => d.id === 'earningsdate')?.value || null };
}
