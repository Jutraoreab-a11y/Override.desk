/* GET /api/v1/rates (réécrit vers api/v1/ai/market-parser?op=rates) — v8.37
   Taux directeurs en vigueur, inflation US et Dollar Index, lus en direct à la source officielle, sans clé :
   Fed de New York (EFFR et fourchette cible), BCE (dépôt et refinancement), Banque d'Angleterre (Bank Rate),
   Banque du Canada (taux cible), BLS (CPI-U et PPI demande finale, glissement annuel calculé), TradingView (DXY).
   Une source illisible laisse sa ligne vide avec l'erreur ; rien n'est estimé. Cache Vercel 30 minutes. */
import { send, type Req, type Res } from './http.js';

type Rate = { bank: string; name: string; v: number | null; from?: number | null; to?: number | null; d: string | null; url: string; quote: string; err?: string };
const UA = { 'User-Agent': 'Mozilla/5.0 FOMO.DESK' };
async function txt(url: string, f: typeof fetch): Promise<string> { const r = await f(url, { headers: UA }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }
const num = (v: unknown): number | null => { const n = typeof v === 'number' ? v : parseFloat(String(v)); return isFinite(n) ? n : null; };

async function fed(f: typeof fetch): Promise<Rate> {
  const url = 'https://markets.newyorkfed.org/api/rates/unsecured/effr/last/1.json';
  try { const t = await txt(url, f), x = (JSON.parse(t).refRates || [])[0] || {};
    return { bank: 'Fed', name: 'Fed Funds effectif (EFFR)', v: num(x.percentRate), from: num(x.targetRateFrom), to: num(x.targetRateTo), d: x.effectiveDate || null, url,
      quote: `"effectiveDate": "${x.effectiveDate}", "percentRate": ${x.percentRate}, "targetRateFrom": ${x.targetRateFrom}, "targetRateTo": ${x.targetRateTo}` };
  } catch (e) { return { bank: 'Fed', name: 'Fed Funds effectif (EFFR)', v: null, d: null, url, quote: '', err: String((e as Error).message) }; }
}
async function ecb(key: string, name: string, f: typeof fetch): Promise<Rate> {
  const url = `https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.${key}.LEV?lastNObservations=1&format=csvdata`;
  try { const L = (await txt(url, f)).trim().split('\n'), h = L[0].split(','), r = L[L.length - 1].split(','), d = r[h.indexOf('TIME_PERIOD')], v = r[h.indexOf('OBS_VALUE')];
    return { bank: 'BCE', name, v: num(v), d, url, quote: `TIME_PERIOD ${d}, OBS_VALUE ${v}` };
  } catch (e) { return { bank: 'BCE', name, v: null, d: null, url, quote: '', err: String((e as Error).message) }; }
}
async function boe(f: typeof fetch): Promise<Rate> {
  const from = new Date(Date.now() - 40 * 864e5), M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const url = `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=${String(from.getUTCDate()).padStart(2, '0')}/${M[from.getUTCMonth()]}/${from.getUTCFullYear()}&Dateto=now&SeriesCodes=IUDBEDR&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`;
  try { const L = (await txt(url, f)).trim().split('\n').filter(l => /^\d/.test(l)), last = L[L.length - 1] || '', [ds, v] = last.split(',');
    const d = ds ? new Date(ds + ' UTC').toISOString().slice(0, 10) : null;
    return { bank: 'BoE', name: 'Bank Rate', v: num(v), d, url, quote: last.trim() };
  } catch (e) { return { bank: 'BoE', name: 'Bank Rate', v: null, d: null, url, quote: '', err: String((e as Error).message) }; }
}
async function boc(f: typeof fetch): Promise<Rate> {
  const url = 'https://www.bankofcanada.ca/valet/observations/V39079/json?recent=1';
  try { const o = (JSON.parse(await txt(url, f)).observations || [])[0] || {}, v = o.V39079 && o.V39079.v;
    return { bank: 'BoC', name: 'Taux cible du financement à un jour', v: num(v), d: o.d || null, url, quote: `"d": "${o.d}", "V39079": {"v": "${v}"}` };
  } catch (e) { return { bank: 'BoC', name: 'Taux cible du financement à un jour', v: null, d: null, url, quote: '', err: String((e as Error).message) }; }
}
/* BLS API publique v1 (sans clé) : indice mensuel ; glissement annuel = indice du mois / indice du même mois un an plus tôt − 1 */
async function bls(id: string, name: string, f: typeof fetch) {
  const url = `https://api.bls.gov/publicAPI/v1/timeseries/data/${id}`;
  try { const j = JSON.parse(await txt(url, f)), D = ((j.Results || {}).series || [])[0]?.data || [];
    const pts = D.filter((x: any) => /^M\d\d$/.test(x.period) && x.period !== 'M13').map((x: any) => ({ ym: `${x.year}-${x.period.slice(1)}`, v: num(x.value) })).sort((a: any, b: any) => a.ym < b.ym ? -1 : 1);
    const at = new Map(pts.map((p: any) => [p.ym, p.v])), yoy = (ym: string) => { const [y, m] = ym.split('-'), p = at.get(`${+y - 1}-${m}`) as number | null, c = at.get(ym) as number | null; return p && c ? Math.round((c / p - 1) * 10000) / 100 : null; };
    const L = pts[pts.length - 1], P = pts[pts.length - 2];
    return { name, ym: L ? L.ym : null, idx: L ? L.v : null, yoy: L ? yoy(L.ym) : null, prevYm: P ? P.ym : null, prevYoy: P ? yoy(P.ym) : null, url,
      quote: L ? `"year":"${L.ym.slice(0, 4)}","period":"M${L.ym.slice(5)}","value":"${L.v}"` : '', calc: 'glissement annuel calculé : indice du mois / indice du même mois de l\'année précédente − 1' };
  } catch (e) { return { name, ym: null, idx: null, yoy: null, url, quote: '', err: String((e as Error).message) }; }
}
async function dxy(f: typeof fetch) {
  const url = 'https://www.tradingview.com/symbols/TVC-DXY/';
  try { const cols = ['close', 'change', 'Perf.W', 'Perf.1M', 'Perf.3M', 'Perf.6M', 'Perf.YTD', 'Perf.Y'];
    /* le DXY est servi par le marché « america », les rendements US par « global » */
    const scan = async (m: string, t: string[]) => { const r = await f(`https://scanner.tradingview.com/${m}/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...UA }, body: JSON.stringify({ symbols: { tickers: t }, columns: cols }) });
      if (!r.ok) throw new Error('HTTP ' + r.status); return ((await r.json()) as { data?: Array<{ s: string; d: number[] }> }).data || []; };
    const [A, B] = await Promise.all([scan('america', ['TVC:DXY']), scan('global', ['TVC:US10Y', 'TVC:US02Y']).catch(() => [])]), all = [...A, ...B], g = (s: string) => all.find(x => x.s === s);
    const m = (x?: { d: number[] }) => x ? { c: num(x.d[0]), ch: num(x.d[1]), w: num(x.d[2]), m1: num(x.d[3]), m3: num(x.d[4]), m6: num(x.d[5]), ytd: num(x.d[6]), y1: num(x.d[7]) } : null;
    return { url, dxy: m(g('TVC:DXY')), us10: m(g('TVC:US10Y')), us02: m(g('TVC:US02Y')) };
  } catch (e) { return { url, err: String((e as Error).message) }; }
}
export async function ratesData(f: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const [a, b, c, d, e, cpi, ppi, dx] = await Promise.all([fed(f), ecb('DFR', 'Facilité de dépôt', f), ecb('MRR_FR', 'Refinancement principal', f), boe(f), boc(f),
    bls('CUUR0000SA0', 'CPI-U (tous éléments, non CVS)', f), bls('WPSFD4', 'PPI demande finale', f), dxy(f)]);
  return { at: new Date().toISOString(), rates: [a, b, c, d, e], cpi, ppi, dx };
}
export async function ratesRoute(_req: Req, res: Res): Promise<void> {
  const out = await ratesData(); res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=1800'); send(res, 200, out);
}
