/* Séries dérivées des matières premières, mêmes formules que le volet 5 (classeur TRADING_Dashboard). */
import type { PricePoint, SeriesPoint, SeriesName } from '../types/models.ts';

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a: number[]) => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
export function zScore(a: Array<number | null>, i: number, n: number): number | null {
  const v = a[i]; if (v == null) return null;
  const w = a.slice(Math.max(0, i - n + 1), i + 1).filter((x): x is number => x != null);
  const s = sd(w); return Number.isFinite(s) && s > 0 ? (v - mean(w)) / s : null;
}
export function corr(x: Array<number | null>, y: Array<number | null>, i: number, n: number): number | null {
  const X: number[] = [], Y: number[] = [];
  for (let j = Math.max(0, i - n + 1); j <= i; j++) { const a = x[j], b = y[j]; if (a != null && b != null) { X.push(a); Y.push(b); } }
  if (X.length < 3) return null;
  const mx = mean(X), my = mean(Y); let c = 0, vx = 0, vy = 0;
  X.forEach((v, k) => { c += (v - mx) * (Y[k] - my); vx += (v - mx) ** 2; vy += (Y[k] - my) ** 2; });
  return vx && vy ? c / Math.sqrt(vx * vy) : null;
}
/** Calcule toutes les séries sur l'axe des dates commun. */
export function computeSeries(prices: PricePoint[]): SeriesPoint[] {
  const key = (p: PricePoint) => `${p.instrument}:${p.contract}`;
  const by: Record<string, Map<string, number>> = {};
  prices.forEach(p => { (by[key(p)] ??= new Map()).set(p.price_date, p.close); });
  const dates = [...new Set(prices.map(p => p.price_date))].sort();
  const col = (k: string) => dates.map(d => by[k]?.get(d) ?? null);
  const brent = col('BRENT:SPOT'), wti = col('WTI:SPOT'), brentM1 = col('BRENT:M1'), gold = col('GOLD:SPOT'), goldM1 = col('GOLD:M1'), silver = col('SILVER:SPOT'), silverM1 = col('SILVER:M1'), cnh = col('USDCNH:SPOT');
  const diff = (a: Array<number | null>, b: Array<number | null>) => a.map((v, i) => v != null && b[i] != null ? v - (b[i] as number) : null);
  const spread = diff(brent, wti);
  const out: SeriesPoint[] = [];
  const push = (s: SeriesName, arr: Array<number | null>) => arr.forEach((v, i) => { if (v != null && Number.isFinite(v)) out.push({ series: s, price_date: dates[i], value: +v.toFixed(6) }); });
  push('SPREAD_BRENT_WTI', spread);
  push('BASIS_BRENT', diff(brent, brentM1));
  push('BASIS_GOLD', diff(gold, goldM1));
  push('BASIS_SILVER', diff(silver, silverM1));
  push('ZSCORE_SPREAD_60', spread.map((_, i) => zScore(spread, i, 60)));
  push('CORR_CNH_BRENT_20', brent.map((_, i) => corr(brent, cnh, i, 20)));
  push('RATIO_GOLD_SILVER', gold.map((g, i) => g != null && silver[i] ? g / (silver[i] as number) : null));
  return out;
}
