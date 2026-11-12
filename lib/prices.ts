/* Actualisation quotidienne des cours (tâche planifiée du soir, aucune IA) :
   - cryptos : CoinGecko /simple/price, public et sans clé ;
   - actions et ETF américains : Tiingo (TIINGO_API_KEY, offre gratuite) ;
   - actions européennes : EODHD (EODHD_API_KEY).
   Chaque cours est stocké dans commodity_prices sous STK:<ticker> ou CRY:<symbole>, contrat SPOT, avec sa source. */
import type { PricePoint } from '../types/models.js';
export const US_UNIVERSE = ['AAPL', 'MSFT', 'NVDA', 'INTC', 'KO', 'SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'EWJ', 'VGK', 'XLE', 'XLK', 'GLD', 'SMH', 'TLT', 'ICLN', 'EWQ', 'EWG', 'INDA', 'FXI', 'XLV', 'XLF', 'ARKK'];
export const EU_UNIVERSE: Record<string, string> = { 'MC.PA': 'MC.PA', 'OR.PA': 'OR.PA', 'AIR.PA': 'AIR.PA', 'TTE.PA': 'TTE.PA', ASML: 'ASML.AS', SAP: 'SAP.XETRA' };
export const CRYPTO_IDS: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', AVAX: 'avalanche-2', AAVE: 'aave', UNI: 'uniswap', LINK: 'chainlink', ONDO: 'ondo-finance', FET: 'fetch-ai', RENDER: 'render-token', TAO: 'bittensor' };
const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
/** Réponse CoinGecko /simple/price?include_last_updated_at=true → cours */
export function parseCoinGecko(j: Record<string, { usd?: number; last_updated_at?: number }>): PricePoint[] {
  return Object.entries(CRYPTO_IDS).flatMap(([sym, id]) => { const x = j[id]; return x && Number.isFinite(x.usd) && x.last_updated_at
    ? [{ instrument: 'CRY:' + sym, contract: 'SPOT', price_date: day(x.last_updated_at), close: x.usd as number, source_name: 'CoinGecko', source_url: 'https://www.coingecko.com/' } as PricePoint] : []; });
}
/** Réponse Tiingo /iex ou /daily/<t>/prices → cours de clôture le plus récent */
export function parseTiingo(t: string, j: Array<{ date: string; close?: number; adjClose?: number }>): PricePoint[] {
  const x = Array.isArray(j) ? j[j.length - 1] : null;
  return x && Number.isFinite(x.close) ? [{ instrument: 'STK:' + t, contract: 'SPOT', price_date: x.date.slice(0, 10), close: x.close as number, source_name: 'Tiingo', source_url: 'https://www.tiingo.com/' } as PricePoint] : [];
}
/** Réponse EODHD /eod/<t>?fmt=json&order=d → dernière clôture */
export function parseEodhd(t: string, j: Array<{ date: string; close?: number }>): PricePoint[] {
  const x = Array.isArray(j) ? j.slice().sort((a, b) => a.date.localeCompare(b.date)).pop() : null;
  return x && Number.isFinite(x.close) ? [{ instrument: 'STK:' + t, contract: 'SPOT', price_date: x.date, close: x.close as number, source_name: 'EODHD', source_url: 'https://eodhd.com/' } as PricePoint] : [];
}
export async function fetchDailyPrices(env: Record<string, string | undefined>, f: typeof fetch = fetch): Promise<{ prices: PricePoint[]; errors: string[] }> {
  const prices: PricePoint[] = [], errors: string[] = [];
  try { const r = await f(`https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&include_last_updated_at=true&ids=${Object.values(CRYPTO_IDS).join(',')}`);
    if (r.ok) prices.push(...parseCoinGecko(await r.json())); else errors.push('CoinGecko HTTP ' + r.status); } catch (e) { errors.push('CoinGecko ' + (e as Error).message); }
  if (env.TIINGO_API_KEY) {
    const start = new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10);
    for (const t of US_UNIVERSE) { try { const r = await f(`https://api.tiingo.com/tiingo/daily/${t}/prices?startDate=${start}&token=${env.TIINGO_API_KEY}`);
      if (r.ok) prices.push(...parseTiingo(t, await r.json())); else errors.push(`Tiingo ${t} HTTP ${r.status}`); } catch (e) { errors.push(`Tiingo ${t} ${(e as Error).message}`); } }
  } else errors.push('TIINGO_API_KEY absente : actions et ETF américains non actualisés');
  if (env.EODHD_API_KEY) {
    for (const [t, sym] of Object.entries(EU_UNIVERSE)) { try { const r = await f(`https://eodhd.com/api/eod/${sym}?fmt=json&order=d&limit=5&api_token=${env.EODHD_API_KEY}`);
      if (r.ok) prices.push(...parseEodhd(t, await r.json())); else errors.push(`EODHD ${t} HTTP ${r.status}`); } catch (e) { errors.push(`EODHD ${t} ${(e as Error).message}`); } }
  } else errors.push('EODHD_API_KEY absente : actions européennes non actualisées');
  return { prices, errors };
}
