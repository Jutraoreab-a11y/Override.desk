/* GET /api/v1/oil (réécrit vers api/v1/ai/market-parser?op=oil) — v8.41
   Variations hebdomadaires des stocks de brut US : API (mardi soir) et EIA (mercredi), réel, consensus et précédent,
   lues sur le calendrier économique public de TradingView (sources citées : api.org, eia.gov). Cache Vercel 10 minutes. */
import { send, q, type Req, type Res } from './http.js';
const KEEP: Record<string, 'api' | 'eia'> = { 'API Crude Oil Stock Change': 'api', 'EIA Crude Oil Stocks Change': 'eia' };
export async function oilData(f: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const from = new Date(Date.now() - 56 * 864e5).toISOString(), to = new Date(Date.now() + 10 * 864e5).toISOString();
  const url = `https://economic-calendar.tradingview.com/events?from=${from}&to=${to}&countries=US`;
  const r = await f(url, { headers: { Origin: 'https://www.tradingview.com', 'User-Agent': 'Mozilla/5.0 FOMO.DESK' } });
  if (!r.ok) throw new Error('TradingView HTTP ' + r.status);
  const j = await r.json() as { result?: Array<Record<string, unknown>> };
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null);
  const ev = (j.result || []).filter(e => KEEP[String(e.title)]).map(e => ({ k: KEEP[String(e.title)], at: String(e.date), actual: num(e.actual), forecast: num(e.forecast), previous: num(e.previous),
    period: e.period || null, src: e.source_url || null })).sort((a, b) => (a.at < b.at ? -1 : 1));
  return { at: new Date().toISOString(), src: 'https://www.tradingview.com/economic-calendar/ (American Petroleum Institute, U.S. Energy Information Administration)', events: ev };
}
export async function oilRoute(_req: Req, res: Res): Promise<void> {
  try { const out = await oilData(); res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=600'); send(res, 200, out); }
  catch (e) { send(res, 502, { error: 'calendrier indisponible : ' + (e instanceof Error ? e.message : String(e)) }); }
}

/* GET /api/v1/spot (op=spot) — v8.41 : comptant or et argent, USD/CNH, DXY et S&P 500 (dernier cours, ouverture, clôture précédente)
   lus sur l'interface publique de TradingView ; la clôture précédente = dernier − variation absolue de la séance. Cache 5 minutes. */
const SPOT: Array<[string, string]> = [['gold', 'OANDA:XAUUSD'], ['silver', 'TVC:SILVER'], ['cnh', 'FX_IDC:USDCNH'], ['dxy', 'TVC:DXY'], ['spx', 'SP:SPX']];
export async function spotRoute(_req: Req, res: Res): Promise<void> {
  try { const r = await fetch('https://scanner.tradingview.com/global/scan', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 FOMO.DESK' },
      body: JSON.stringify({ symbols: { tickers: SPOT.map(x => x[1]) }, columns: ['close', 'open', 'change_abs', 'update_mode'] }) });
    if (!r.ok) throw new Error('TradingView HTTP ' + r.status);
    const j = await r.json() as { data?: Array<{ s: string; d: unknown[] }> }, n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null), out: Record<string, unknown> = {};
    for (const [k, t] of SPOT) { const x = (j.data || []).find(y => y.s === t); if (!x) continue; const c = n(x.d[0]), ch = n(x.d[2]);
      out[k] = { t, last: c, open: n(x.d[1]), prev: c !== null && ch !== null ? Math.round((c - ch) * 1e5) / 1e5 : null, mode: x.d[3] }; }
    /* v8.42 : premiers contrats à terme (ligne du jour) et volume échangé du contrat or COMEX */
    const FUT: Array<[string, string]> = [['goldF', 'COMEX:GC1!'], ['silverF', 'COMEX:SI1!'], ['brentS', 'ICEEUR:BRN1!'], ['wtiF', 'NYMEX:CL1!']];
    try { const r2 = await fetch('https://scanner.tradingview.com/futures/scan', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 FOMO.DESK' },
        body: JSON.stringify({ symbols: { tickers: FUT.map(x => x[1]) }, columns: ['close', 'open', 'change_abs', 'volume', 'average_volume_10d_calc', 'average_volume_30d_calc'] }) });
      if (r2.ok) { const j2 = await r2.json() as { data?: Array<{ s: string; d: unknown[] }> };
        for (const [k, t] of FUT) { const x = (j2.data || []).find(y => y.s === t); if (!x) continue; const c = n(x.d[0]), ch = n(x.d[2]);
          out[k] = { t, last: c, open: n(x.d[1]), prev: c !== null && ch !== null ? Math.round((c - ch) * 1e5) / 1e5 : null, vol: n(x.d[3]), avg10: n(x.d[4]), avg30: n(x.d[5]) }; } } } catch { /* contrats à terme facultatifs */ }
    /* 2e contrat (Brent ICE, WTI NYMEX) : déduit de l'échéance du 1er contrat, lu directement (pas de symbole continu « 2! ») */
    try { const MC = 'FGHJKMNQUVXZ', MN: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
      const r3 = await fetch('https://scanner.tradingview.com/futures/scan', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 FOMO.DESK' }, body: JSON.stringify({ symbols: { tickers: ['ICEEUR:BRN1!', 'NYMEX:CL1!'] }, columns: ['description'] }) });
      const j3 = await r3.json() as { data?: Array<{ s: string; d: unknown[] }> }, next: Array<[string, string]> = [];
      for (const x of j3.data || []) { const m = String(x.d[0] || '').match(/\((\w{3}) (\d{4})\)/); if (!m || MN[m[1]] === undefined) continue; let mo = MN[m[1]] + 1, y = +m[2]; if (mo > 11) { mo = 0; y++; }
        next.push([x.s.startsWith('ICEEUR') ? 'brentF2' : 'wtiF2', (x.s.startsWith('ICEEUR') ? 'ICEEUR:BRN' : 'NYMEX:CL') + MC[mo] + y]); }
      if (next.length) { const r4 = await fetch('https://scanner.tradingview.com/futures/scan', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 FOMO.DESK' }, body: JSON.stringify({ symbols: { tickers: next.map(x => x[1]) }, columns: ['close', 'open', 'change_abs', 'description'] }) });
        const j4 = await r4.json() as { data?: Array<{ s: string; d: unknown[] }> };
        for (const [k, t] of next) { const x = (j4.data || []).find(y => y.s === t); if (!x) continue; const c = n(x.d[0]), ch = n(x.d[2]); out[k] = { t, label: x.d[3], last: c, open: n(x.d[1]), prev: c !== null && ch !== null ? Math.round((c - ch) * 1e5) / 1e5 : null }; } } } catch { /* 2e contrat facultatif */ }
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
    send(res, 200, { at: new Date().toISOString(), src: 'https://www.tradingview.com/ (OANDA XAU/USD et TVC SILVER comptant, FX_IDC USD/CNH, TVC DXY, S&P 500, premiers contrats COMEX, ICE et NYMEX)', q: out });
  } catch (e) { send(res, 502, { error: 'cours indisponibles : ' + (e instanceof Error ? e.message : String(e)) }); }
}

/* GET /api/v1/hist?sym=GC%3DF (op=hist) — v8.43 : historique quotidien d'un an (ouverture, clôture, volume) lu sur Yahoo Finance
   (point d'accès public query2). Liste fermée de symboles. Cache Vercel 6 heures. */
const HIST_OK = new Set(['GC=F', 'SI=F', 'BZ=F', 'CL=F', 'DX-Y.NYB', 'CNH=X', '^GSPC']);
export async function histRoute(req: Req, res: Res): Promise<void> {
  const sym = String(q(req, 'sym') || '');
  if (!HIST_OK.has(sym)) { send(res, 400, { error: 'symbole non autorisé' }); return; }
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1y&interval=1d`;
  try { const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }); if (!r.ok) throw new Error('Yahoo HTTP ' + r.status);
    const j = await r.json() as { chart?: { result?: Array<{ meta?: { gmtoffset?: number }; timestamp?: number[]; indicators?: { quote?: Array<{ open?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }> } }> } };
    const R = j.chart && j.chart.result && j.chart.result[0]; if (!R || !R.timestamp) throw new Error('réponse vide');
    const off = (R.meta && R.meta.gmtoffset) || 0, Q = (R.indicators && R.indicators.quote && R.indicators.quote[0]) || {};
    const rows = R.timestamp.map((t, i) => ({ d: new Date((t + off) * 1000).toISOString().slice(0, 10), o: Q.open ? Q.open[i] ?? null : null, c: Q.close ? Q.close[i] ?? null : null, v: Q.volume ? Q.volume[i] ?? null : null }));
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=21600');
    send(res, 200, { at: new Date().toISOString(), sym, src: `https://finance.yahoo.com/quote/${encodeURIComponent(sym)}/history/`, rows });
  } catch (e) { send(res, 502, { error: 'historique indisponible : ' + (e instanceof Error ? e.message : String(e)) }); }
}
