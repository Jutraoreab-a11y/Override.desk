/* Actualisation quotidienne sans clé d'API (tâche planifiée du soir, aucune IA) : cryptos via CoinGecko, public et sans clé.
   Les cours des actions et des ETF sont relus par l'IA sur les pages publiques, à la demande (bouton « Actualiser les cours »).
   Les fonctions parseTiingo / parseEodhd restent disponibles pour qui voudrait brancher ces fournisseurs, sans être appelées. */
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
export async function fetchDailyPrices(_env: Record<string, string | undefined>, f: typeof fetch = fetch): Promise<{ prices: PricePoint[]; errors: string[] }> {
  const prices: PricePoint[] = [], errors: string[] = [];
  try { const r = await f(`https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&include_last_updated_at=true&ids=${Object.values(CRYPTO_IDS).join(',')}`);
    if (r.ok) prices.push(...parseCoinGecko(await r.json())); else errors.push('CoinGecko HTTP ' + r.status); } catch (e) { errors.push('CoinGecko ' + (e as Error).message); }
  return { prices, errors };
}
