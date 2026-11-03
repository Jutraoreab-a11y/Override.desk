/* Sources macro publiques : EIA (pétrole spot et futures WTI) et BCE (taux de change de référence). */
import type { PricePoint } from '../types/models.ts';

/** EIA API v2 : séries quotidiennes. RBRTE = Brent spot, RWTC = WTI spot (Cushing), RCLC1..3 = futures WTI NYMEX contrats 1 à 3. */
export const EIA_SERIES: Record<string, { instrument: 'BRENT' | 'WTI'; contract: 'SPOT' | 'M1' | 'M2' | 'M3' }> = {
  RBRTE: { instrument: 'BRENT', contract: 'SPOT' }, RWTC: { instrument: 'WTI', contract: 'SPOT' },
  RCLC1: { instrument: 'WTI', contract: 'M1' }, RCLC2: { instrument: 'WTI', contract: 'M2' }, RCLC3: { instrument: 'WTI', contract: 'M3' },
};
export async function fetchEia(apiKey: string, days = 90, f: typeof fetch = fetch): Promise<PricePoint[]> {
  const out: PricePoint[] = [];
  for (const [route, ids] of [['petroleum/pri/spt', ['RBRTE', 'RWTC']], ['petroleum/pri/fut', ['RCLC1', 'RCLC2', 'RCLC3']]] as const) {
    const p = new URLSearchParams({ api_key: apiKey, frequency: 'daily', 'data[0]': 'value', 'sort[0][column]': 'period', 'sort[0][direction]': 'desc', length: String(days * ids.length) });
    ids.forEach(id => p.append('facets[series][]', id));
    const url = `https://api.eia.gov/v2/${route}/data/?${p}`;
    const r = await f(url);
    if (!r.ok) throw new Error(`EIA HTTP ${r.status}`);
    const j = await r.json() as { response?: { data?: Array<{ period: string; series: string; value: string | number | null }> } };
    for (const d of j.response?.data ?? []) {
      const m = EIA_SERIES[d.series], v = d.value == null ? NaN : Number(d.value);
      if (m && Number.isFinite(v)) out.push({ instrument: m.instrument, contract: m.contract, price_date: d.period, close: v, source_name: 'EIA (U.S. Energy Information Administration)', source_url: url.replace(apiKey, '***') });
    }
  }
  return out;
}
/** BCE : taux de référence du jour (XML public). */
export async function fetchEcb(f: typeof fetch = fetch): Promise<Array<{ currency: string; rate_date: string; rate: number }>> {
  const x = await (await f('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml')).text();
  const date = x.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1];
  if (!date) throw new Error('BCE : date introuvable');
  return [...x.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)].map(m => ({ currency: m[1], rate_date: date, rate: parseFloat(m[2]) }));
}
