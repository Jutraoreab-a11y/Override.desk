/* Comptes publiés des sociétés cotées aux États-Unis : SEC EDGAR, données XBRL « companyfacts » (gratuites, sans clé).
   Règles : seuls les rapports annuels 10-K (ou 20-F / 40-F pour les émetteurs étrangers) ; une valeur de flux doit couvrir
   un exercice complet (350 à 380 jours) ; l'exercice est identifié par sa date de clôture (le champ fy de la SEC est
   l'année du dépôt, pas l'exercice) ; à date égale, la valeur la plus récemment déposée l'emporte (retraitements). */
type Fact = { start?: string; end: string; val: number; form?: string; filed?: string; fp?: string };
export type CompanyFacts = { entityName?: string; facts?: Record<string, Record<string, { units: Record<string, Fact[]> }>> };
const ANNUAL = /^(10-K|20-F|40-F)(\/A)?$/;
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 864e5;

/** Valeurs annuelles d'une balise (la première balise de la liste qui existe a priorité, les suivantes complètent). */
export function annual(f: CompanyFacts, tags: string[], kind: 'flow' | 'stock', unit = 'USD'): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of tags) {                       // balises par ordre de priorité : une date déjà renseignée n'est pas écrasée
    const one = new Map<string, { v: number; filed: string }>();
    for (const ns of ['us-gaap', 'ifrs-full']) {
      const xs = f.facts?.[ns]?.[t]?.units?.[unit] || [];
      for (const x of xs) {
        if (!ANNUAL.test(x.form || '') || typeof x.val !== 'number') continue;
        if (kind === 'flow') { if (!x.start) continue; const d = days(x.start, x.end); if (d < 350 || d > 380) continue; }
        const p = one.get(x.end); if (!p || (x.filed || '') >= p.filed) one.set(x.end, { v: x.val, filed: x.filed || '' });
      }
    }
    for (const [e, o] of one) if (!out.has(e)) out.set(e, o.v);
  }
  return out;
}
const TAGS = {
  rev: ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'Revenue'],
  ni: ['NetIncomeLoss', 'ProfitLossAttributableToOwnersOfParent', 'ProfitLoss'],
  op: ['OperatingIncomeLoss', 'ProfitLossFromOperatingActivities'],
  da: ['DepreciationDepletionAndAmortization', 'DepreciationAndAmortization', 'DepreciationAmortizationAndAccretionNet', 'Depreciation', 'DepreciationAndAmortisationExpense'],
  cfo: ['NetCashProvidedByUsedInOperatingActivities', 'CashFlowsFromUsedInOperatingActivities'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment', 'PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities'],
  eps: ['EarningsPerShareDiluted', 'DilutedEarningsLossPerShare'],
  debtNc: ['LongTermDebtNoncurrent', 'LongTermDebt', 'NoncurrentPortionOfNoncurrentBorrowings'],
  debtC: ['LongTermDebtCurrent', 'CurrentPortionOfNoncurrentBorrowings'],
  stDebt: ['ShortTermBorrowings', 'CommercialPaper', 'ShorttermBorrowings'],
  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'CashAndCashEquivalents'],
  eq: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest', 'EquityAttributableToOwnersOfParent'],
};
export interface Statements { name: string; currency: string; years: string[]; ends: string[]; rev: (number | null)[]; ebitda: (number | null)[]; ni: (number | null)[]; eps: (number | null)[];
  fcf: (number | null)[]; nd: (number | null)[]; roe: (number | null)[]; shares: number | null; missing: string[] }
/** Les cinq derniers exercices au format de l'analyse financière (millions de la devise de publication, BPA en unités). */
export function toStatements(f: CompanyFacts, n = 5): Statements {
  const cur = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'CHF', 'TWD', 'CNY', 'INR'].find(c => annual(f, TAGS.rev, 'flow', c).size) || 'USD';
  const g = (k: keyof typeof TAGS, kind: 'flow' | 'stock', unit = cur) => annual(f, TAGS[k], kind, unit);
  const rev = g('rev', 'flow'), ends = [...rev.keys()].sort().slice(-n);
  const ni = g('ni', 'flow'), op = g('op', 'flow'), da = g('da', 'flow'), cfo = g('cfo', 'flow'), cx = g('capex', 'flow'), eps = g('eps', 'flow', cur + '/shares');
  const dn = g('debtNc', 'stock'), dc = g('debtC', 'stock'), sd = g('stDebt', 'stock'), ca = g('cash', 'stock'), eq = g('eq', 'stock');
  const M = (v: number | undefined) => v === undefined ? null : +(v / 1e6).toFixed(1), missing: string[] = [];
  const col = (fn: (e: string) => number | null, lab: string) => { const a = ends.map(fn); if (a.every(x => x === null)) missing.push(lab); return a; };
  const shares = (() => { const u = f.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares || []; const x = u.slice().sort((a, b) => a.end.localeCompare(b.end)).pop(); return x ? +(x.val / 1e6).toFixed(3) : null; })();
  return { name: f.entityName || '', currency: cur, ends, years: ends.map(e => 'FY' + e.slice(0, 4)),
    rev: col(e => M(rev.get(e)), 'chiffre d\'affaires'),
    ebitda: col(e => op.has(e) && da.has(e) ? M(op.get(e)! + da.get(e)!) : null, 'EBITDA (résultat opérationnel + amortissements)'),
    ni: col(e => M(ni.get(e)), 'résultat net'),
    eps: col(e => eps.has(e) ? +eps.get(e)!.toFixed(2) : null, 'BPA dilué'),
    fcf: col(e => cfo.has(e) && cx.has(e) ? M(cfo.get(e)! - cx.get(e)!) : null, 'flux de trésorerie disponible'),
    nd: col(e => ca.has(e) && (dn.has(e) || dc.has(e) || sd.has(e)) ? M((dn.get(e) || 0) + (dc.get(e) || 0) + (sd.get(e) || 0) - ca.get(e)!) : null, 'dette nette'),
    roe: col(e => ni.has(e) && eq.get(e) ? +(ni.get(e)! / eq.get(e)! * 100).toFixed(2) : null, 'ROE'),
    shares, missing };
}
/** Code CIK d'un ticker à partir de company_tickers.json de la SEC. */
export function findCik(list: Record<string, { cik_str: number; ticker: string; title: string }>, ticker: string) {
  const t = ticker.toUpperCase().replace(/\.US$/, '').replace('.', '-');
  const x = Object.values(list).find(r => r.ticker.toUpperCase() === t);
  return x ? { cik: String(x.cik_str).padStart(10, '0'), title: x.title } : null;
}
