/* OVERRIDE.DESK : modèles de données partagés (base Supabase, API et adaptateurs). */

export type ConnStatus = 'simulation' | 'live' | 'error';
export type Platform = 'MT4' | 'MT5' | 'STT';
export type Side = 'buy' | 'sell';
export type AssetClass = 'Actions' | 'ETF' | 'Options' | 'Obligations' | 'Crypto' | 'VMP / OPCVM' | 'Private equity' | 'Commodities' | 'Cash';

/* ---------- Trading spéculatif ---------- */
export interface TradingAccount {
  id: string; user_id: string; platform: Platform; login: string; server: string | null; broker: string | null;
  account_type: 'Réel' | 'Démo' | 'Prop firm'; currency: string;
  balance: number | null; equity: number | null; margin: number | null; free_margin: number | null; leverage: number | null;
  status: ConnStatus; last_sync_at: string | null; last_error: string | null;
}
export interface ActiveTrade {
  account_id: string; user_id: string; ticket: string; symbol: string; side: Side; volume: number;
  open_price: number | null; current_price: number | null; stop_loss: number | null; take_profit: number | null;
  swap: number; profit: number; opened_at: string | null;
}
export interface TradeHistoryRow {
  account_id: string; user_id: string; ticket: string; symbol: string; side: Side; volume: number;
  open_price: number | null; close_price: number | null; stop_loss: number | null; take_profit: number | null;
  commission: number; swap: number; profit: number; opened_at: string | null; closed_at: string;
}
/** Charge utile envoyée par l'EA MetaTrader (mt/OverrideSync.mq5 ou .mq4) vers /api/v1/trading/mt-sync. */
export interface MtSyncPayload {
  account: { platform: 'MT4' | 'MT5'; login: string | number; server?: string; broker?: string; currency: string;
    balance: number; equity: number; margin?: number; free_margin?: number; leverage?: number };
  positions: Array<{ ticket: string | number; symbol: string; side: Side; volume: number; open_price?: number; current_price?: number;
    stop_loss?: number; take_profit?: number; swap?: number; profit?: number; opened_at?: string }>;
  history?: Array<{ ticket: string | number; symbol: string; side: Side; volume: number; open_price?: number; close_price?: number;
    stop_loss?: number; take_profit?: number; commission?: number; swap?: number; profit: number; opened_at?: string; closed_at: string }>;
}

/* ---------- Placements ---------- */
export type BrokerId = 'binance' | 'kraken' | 'okx' | 'coinbase' | 'saxo' | 'ibkr_flex' | 'ledger' | 'gateway' | 'csv';
export interface BrokerConnection {
  id: string; user_id: string; broker: BrokerId; label: string; status: ConnStatus;
  last_sync_at: string | null; last_error: string | null; credentials_enc?: string | null;
}
/** Identifiants saisis dans les paramètres (chiffrés côté serveur avant stockage). */
export interface BrokerCredentials {
  apiKey?: string; apiSecret?: string; passphrase?: string;   // Binance, Kraken, OKX
  keyName?: string; privateKey?: string;                      // Coinbase (clé CDP : nom + clé privée EC)
  accessToken?: string;                                       // Saxo OpenAPI
  flexToken?: string; flexQueryId?: string;                   // IBKR Flex Web Service
  addresses?: string[];                                       // Ledger : adresses publiques BTC
  url?: string; token?: string;                               // passerelle personnalisée
}
export interface Position {
  symbol: string; name?: string; asset_class: AssetClass; quantity: number;
  avg_cost: number | null; last_price: number | null; currency: string;
  stop_loss?: number | null; take_profit?: number | null;
}
export interface CashBalance { currency: string; amount: number; }
export interface RealizedEntry { external_id: string; symbol: string; asset_class: AssetClass; realized_on: string; amount_eur: number; }
export interface BrokerSnapshot { positions: Position[]; cash: CashBalance[]; realized?: RealizedEntry[]; }
/** Contrat commun à tous les adaptateurs de courtiers. */
export interface BrokerAdapter {
  id: BrokerId; label: string;
  required: Array<keyof BrokerCredentials>;
  fetchSnapshot(creds: BrokerCredentials, fetchImpl?: typeof fetch): Promise<BrokerSnapshot>;
}

/* ---------- PnL et risque ---------- */
export interface PnlRow { portfolio: 'Trading' | 'Placements'; asset_class: string; unrealized_eur: number; realized_eur: number; }
export interface PositionRisk {
  portfolio: string; asset_class: string; symbol: string; platform: string | null; value_eur: number | null;
  unrealized_eur: number | null; stop_loss: number | null; take_profit: number | null; risk_eur: number | null; reward_eur: number | null;
}
export interface RiskSummary { risk_eur: number; reward_eur: number; rr: number | null; unprotected: number; }

/* ---------- Macro ---------- */
export type Instrument = 'BRENT' | 'WTI' | 'GOLD' | 'SILVER' | 'USDCNH' | 'SPX';
export type Contract = 'SPOT' | 'M1' | 'M2' | 'M3';
export interface PricePoint { instrument: Instrument; contract: Contract; price_date: string; open?: number | null; close: number; source_name: string; source_url?: string; }
export type SeriesName = 'SPREAD_BRENT_WTI' | 'BASIS_BRENT' | 'BASIS_GOLD' | 'BASIS_SILVER' | 'ZSCORE_SPREAD_60' | 'CORR_CNH_BRENT_20' | 'RATIO_GOLD_SILVER';
export interface SeriesPoint { series: SeriesName; price_date: string; value: number | null; }

/* ---------- IA connectée ---------- */
export interface AiSourceRecord {
  metric: string; value_numeric: number | null; value_text: string | null;
  source_url: string; source_name: string; quote: string | null;
  timestamp_retrieved: string; confidence_score: number; model: string;
}
