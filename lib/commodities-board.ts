/* GET /api/v1/commodities (réécrit vers api/v1/ai/market-parser?op=board) — v8.33
   Tableau de toutes les matières premières, par catégorie : premier contrat à terme de chaque marché, cours différé (~10 min)
   lu sur l'interface publique de TradingView (scanner.tradingview.com, sans clé). Réponse mise en cache 5 minutes par Vercel. */
import { send, type Req, type Res } from './http.js';

export const BOARD: Array<[string, Array<[string, string, string]>]> = [
  ['Énergie', [['NYMEX:CL1!', 'Pétrole WTI', 'USD/baril'], ['ICEEUR:BRN1!', 'Pétrole Brent', 'USD/baril'], ['NYMEX:NG1!', 'Gaz naturel Henry Hub', 'USD/MMBtu'],
    ['ICEENDEX:TFM1!', 'Gaz TTF (Europe)', 'EUR/MWh'], ['NYMEX:RB1!', 'Essence RBOB', 'USD/gallon'], ['NYMEX:HO1!', 'Fioul / diesel ULSD', 'USD/gallon'],
    ['ICEEUR:ATW1!', 'Charbon API2 Rotterdam', 'USD/t'], ['COMEX:UX1!', 'Uranium U3O8', 'USD/lb']]],
  ['Métaux précieux', [['COMEX:GC1!', 'Or', 'USD/oz'], ['COMEX:SI1!', 'Argent', 'USD/oz'], ['NYMEX:PL1!', 'Platine', 'USD/oz'], ['NYMEX:PA1!', 'Palladium', 'USD/oz']]],
  ['Métaux industriels', [['COMEX:HG1!', 'Cuivre (COMEX)', 'USD/lb'], ['LME:CA1!', 'Cuivre (LME)', 'USD/t'], ['LME:AH1!', 'Aluminium (LME)', 'USD/t'], ['LME:ZS1!', 'Zinc (LME)', 'USD/t'],
    ['LME:NI1!', 'Nickel (LME)', 'USD/t'], ['LME:PB1!', 'Plomb (LME)', 'USD/t'], ['LME:SN1!', 'Étain (LME)', 'USD/t'], ['LME:CO1!', 'Cobalt (LME)', 'USD/t'],
    ['COMEX:LTH1!', 'Lithium (hydroxyde)', 'USD/kg'], ['SGX:FEF1!', 'Minerai de fer', 'USD/t'], ['COMEX:HRC1!', 'Acier (bobines à chaud)', 'USD/t']]],
  ['Céréales et oléagineux', [['CBOT:ZC1!', 'Maïs (CBOT)', 'USc/boisseau'], ['EURONEXT:EMA1!', 'Maïs (Euronext)', 'EUR/t'], ['CBOT:ZW1!', 'Blé tendre (CBOT)', 'USc/boisseau'],
    ['CBOT:KE1!', 'Blé dur d\'hiver (KC)', 'USc/boisseau'], ['EURONEXT:EBM1!', 'Blé meunier (Euronext)', 'EUR/t'], ['CBOT:ZS1!', 'Soja', 'USc/boisseau'],
    ['CBOT:ZM1!', 'Tourteau de soja', 'USD/t courte'], ['CBOT:ZL1!', 'Huile de soja', 'USc/lb'], ['EURONEXT:ECO1!', 'Colza (Euronext)', 'EUR/t'], ['ICEUS:RS1!', 'Canola', 'CAD/t'],
    ['MYX:FCPO1!', 'Huile de palme', 'MYR/t'], ['CBOT:ZO1!', 'Avoine', 'USc/boisseau'], ['CBOT:ZR1!', 'Riz', 'USD/quintal']]],
  ['Denrées tropicales', [['ICEUS:KC1!', 'Café arabica', 'USc/lb'], ['ICEEUR:RC1!', 'Café robusta', 'USD/t'], ['ICEUS:CC1!', 'Cacao (New York)', 'USD/t'], ['ICEEUR:C1!', 'Cacao (Londres)', 'GBP/t'],
    ['ICEUS:SB1!', 'Sucre brut n° 11', 'USc/lb'], ['ICEEUR:W1!', 'Sucre blanc', 'USD/t'], ['ICEUS:CT1!', 'Coton', 'USc/lb'], ['ICEUS:OJ1!', 'Jus d\'orange', 'USc/lb'], ['CME:LBR1!', 'Bois (lumber)', 'USD/1000 pi.pl.']]],
  ['Élevage et produits laitiers', [['CME:LE1!', 'Bovins vivants', 'USc/lb'], ['CME:GF1!', 'Bovins d\'engraissement', 'USc/lb'], ['CME:HE1!', 'Porcs maigres', 'USc/lb'],
    ['CME:DC1!', 'Lait classe III', 'USD/cwt'], ['CME:GDK1!', 'Lait classe IV', 'USD/cwt'], ['CME:CB1!', 'Beurre', 'USc/lb']]],
];
export async function boardData(f: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const tickers = BOARD.flatMap(([, L]) => L.map(x => x[0]));
  const r = await f('https://scanner.tradingview.com/futures/scan', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 FOMO.DESK' },
    body: JSON.stringify({ symbols: { tickers }, columns: ['close', 'change', 'currency'] }) });
  if (!r.ok) throw new Error('TradingView HTTP ' + r.status);
  const j = await r.json() as { data?: Array<{ s: string; d: [number, number, string] }> };
  const got = new Map((j.data || []).map(x => [x.s, x.d]));
  return { at: new Date().toISOString(), src: 'https://www.tradingview.com/ (premier contrat à terme, cours différé ~10 min)',
    groups: BOARD.map(([g, L]) => ({ g, items: L.map(([t, l, u]) => { const d = got.get(t); return { t, l, u, c: d && isFinite(d[0]) ? d[0] : null, ch: d && isFinite(d[1]) ? d[1] : null }; }) })) };
}
export async function boardRoute(_req: Req, res: Res): Promise<void> {
  try { const out = await boardData(); res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300'); send(res, 200, out); }
  catch (e) { send(res, 502, { error: 'cours indisponibles : ' + (e instanceof Error ? e.message : String(e)) }); }
}
