/* Registre des adaptateurs. Les plateformes sans API officielle (XTB, Trade Republic, DEGIRO, Boursorama…) passent par l'import CSV. */
import type { BrokerAdapter, BrokerId } from '../../types/models.js';
import { binance, kraken, okx, coinbase, ledger } from './crypto-exchanges.js';
import { saxo, ibkrFlex, gateway } from './securities.js';

export const ADAPTERS: Partial<Record<BrokerId, BrokerAdapter>> = { binance, kraken, okx, coinbase, ledger, saxo, ibkr_flex: ibkrFlex, gateway };
/** Correspondance nom affiché → adaptateur (liste déroulante du volet 4). */
export const BROKER_MAP: Record<string, BrokerId> = {
  'Binance': 'binance', 'Kraken': 'kraken', 'OKX': 'okx', 'Coinbase': 'coinbase', 'Ledger (cold storage)': 'ledger',
  'Saxo Bank': 'saxo', 'Interactive Brokers': 'ibkr_flex',
  'XTB': 'csv', 'Trade Republic': 'csv', 'DEGIRO': 'csv', 'Boursorama Banque': 'csv', 'Fortuneo': 'csv', 'BforBank': 'csv', 'eToro': 'csv', 'Revolut': 'csv', 'Bitpanda': 'csv',
};
