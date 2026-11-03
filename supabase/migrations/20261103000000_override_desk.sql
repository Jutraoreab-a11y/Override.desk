-- OVERRIDE.DESK : schéma des flux de données (Supabase / PostgreSQL 15+)
-- Chaque table appartient à un utilisateur (auth.users) et est protégée par RLS.
-- Les écritures des connecteurs passent par les fonctions serveur (clé service_role, qui contourne RLS).

create extension if not exists pgcrypto;

-- ============ Trading spéculatif (MT4 / MT5 / SocialTraderTools) ============
create table if not exists public.trading_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  platform      text not null check (platform in ('MT4','MT5','STT')),
  login         text not null,
  server        text,
  broker        text,
  account_type  text check (account_type in ('Réel','Démo','Prop firm')) default 'Réel',
  currency      text not null default 'EUR',
  balance       numeric,
  equity        numeric,
  margin        numeric,
  free_margin   numeric,
  leverage      integer,
  webhook_key_hash text,                 -- SHA-256 de la clé envoyée par l'EA (jamais la clé en clair)
  status        text not null default 'simulation' check (status in ('simulation','live','error')),
  last_sync_at  timestamptz,
  last_error    text,
  created_at    timestamptz not null default now(),
  unique (user_id, platform, login, server)
);

create table if not exists public.active_trades (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.trading_accounts(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  ticket        text not null,
  symbol        text not null,
  side          text not null check (side in ('buy','sell')),
  volume        numeric not null,
  open_price    numeric,
  current_price numeric,
  stop_loss     numeric,
  take_profit   numeric,
  swap          numeric default 0,
  profit        numeric default 0,
  opened_at     timestamptz,
  updated_at    timestamptz not null default now(),
  unique (account_id, ticket)
);

create table if not exists public.trade_history (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.trading_accounts(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  ticket        text not null,
  symbol        text not null,
  side          text not null check (side in ('buy','sell')),
  volume        numeric not null,
  open_price    numeric,
  close_price   numeric,
  stop_loss     numeric,
  take_profit   numeric,
  commission    numeric default 0,
  swap          numeric default 0,
  profit        numeric not null,        -- profit brut de l'ordre, devise du compte
  opened_at     timestamptz,
  closed_at     timestamptz not null,
  unique (account_id, ticket)
);
create index if not exists trade_history_closed_idx on public.trade_history (user_id, closed_at);

-- ============ Placements et courtiers ============
create table if not exists public.broker_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  broker        text not null,           -- identifiant d'adaptateur : binance, kraken, okx, coinbase, saxo, ibkr_flex, ledger, gateway, csv
  label         text not null,
  -- Identifiants chiffrés côté serveur (AES-256-GCM, clé ENCRYPTION_KEY hors base) : jamais lisibles par le navigateur
  credentials_enc text,
  status        text not null default 'simulation' check (status in ('simulation','live','error')),
  last_sync_at  timestamptz,
  last_error    text,
  created_at    timestamptz not null default now(),
  unique (user_id, label)
);

create table if not exists public.portfolio_positions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.broker_connections(id) on delete cascade,
  asset_class   text not null check (asset_class in ('Actions','ETF','Options','Obligations','Crypto','VMP / OPCVM','Private equity','Commodities','Cash')),
  symbol        text not null,
  name          text,
  quantity      numeric not null,
  avg_cost      numeric,                 -- PRU
  last_price    numeric,
  currency      text not null default 'EUR',
  stop_loss     numeric,
  take_profit   numeric,
  source        text not null default 'live' check (source in ('live','csv','override')),
  updated_at    timestamptz not null default now(),
  unique (connection_id, symbol)
);

create table if not exists public.cash_balances (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.broker_connections(id) on delete cascade,
  account_id    uuid references public.trading_accounts(id) on delete cascade,
  currency      text not null default 'EUR',
  amount        numeric not null,
  updated_at    timestamptz not null default now(),
  check ((connection_id is not null) <> (account_id is not null))
);
create unique index if not exists cash_balances_conn_uq on public.cash_balances (connection_id, currency) where connection_id is not null;
create unique index if not exists cash_balances_acct_uq on public.cash_balances (account_id, currency) where account_id is not null;

create table if not exists public.realized_pnl (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.broker_connections(id) on delete cascade,
  asset_class   text not null,
  symbol        text not null,
  realized_on   date not null,
  amount_eur    numeric not null,
  external_id   text,
  unique (connection_id, external_id)
);
create index if not exists realized_pnl_date_idx on public.realized_pnl (user_id, realized_on);

-- Taux de change journaliers (BCE) pour la conversion en euros
create table if not exists public.fx_rates (
  currency   text not null,              -- devise cotée pour 1 EUR (ex. USD)
  rate_date  date not null,
  rate       numeric not null,
  source     text not null default 'BCE',
  primary key (currency, rate_date)
);

-- ============ Macro et matières premières ============
create table if not exists public.commodity_prices (
  instrument  text not null check (instrument in ('BRENT','WTI','GOLD','SILVER','USDCNH','SPX')),
  contract    text not null default 'SPOT' check (contract in ('SPOT','M1','M2','M3')),
  price_date  date not null,
  open        numeric,
  close       numeric not null,
  source_name text not null,
  source_url  text,
  retrieved_at timestamptz not null default now(),
  primary key (instrument, contract, price_date)
);

create table if not exists public.commodity_series (
  series      text not null check (series in ('SPREAD_BRENT_WTI','BASIS_BRENT','BASIS_GOLD','BASIS_SILVER','ZSCORE_SPREAD_60','CORR_CNH_BRENT_20','RATIO_GOLD_SILVER')),
  price_date  date not null,
  value       numeric,
  computed_at timestamptz not null default now(),
  primary key (series, price_date)
);

-- ============ IA connectée : traçabilité ============
create table if not exists public.ai_sources (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade,
  metric              text not null,
  value_numeric       numeric,
  value_text          text,
  source_url          text not null,
  source_name         text not null,
  quote               text,
  timestamp_retrieved timestamptz not null default now(),
  confidence_score    numeric not null check (confidence_score between 0 and 1),
  model               text
);
create index if not exists ai_sources_metric_idx on public.ai_sources (metric, timestamp_retrieved desc);

-- ============ Sécurité : RLS ============
do $$ declare t text; begin
  foreach t in array array['trading_accounts','active_trades','trade_history','broker_connections','portfolio_positions','cash_balances','realized_pnl','ai_sources'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
alter table public.commodity_prices enable row level security;
alter table public.commodity_series enable row level security;
alter table public.fx_rates enable row level security;
drop policy if exists read_all on public.commodity_prices;
drop policy if exists read_all on public.commodity_series;
drop policy if exists read_all on public.fx_rates;
create policy read_all on public.commodity_prices for select using (auth.role() = 'authenticated');
create policy read_all on public.commodity_series for select using (auth.role() = 'authenticated');
create policy read_all on public.fx_rates for select using (auth.role() = 'authenticated');
-- Les identifiants chiffrés ne sont jamais renvoyés au navigateur : colonne retirée du rôle authenticated
revoke all on public.broker_connections from authenticated;
grant select (id, user_id, broker, label, status, last_sync_at, last_error, created_at) on public.broker_connections to authenticated;
grant delete on public.broker_connections to authenticated;

-- ============ Conversion en euros ============
create or replace function public.to_eur(amount numeric, ccy text, on_date date default current_date)
returns numeric language sql stable as $$
  select case when ccy is null or upper(ccy) = 'EUR' then amount
    else amount / nullif((select rate from public.fx_rates f where f.currency = upper(ccy) and f.rate_date <= on_date order by rate_date desc limit 1), 0) end
$$;

-- ============ Risque : SL / TP / RR par ligne ============
create or replace view public.v_position_risk with (security_invoker = true) as
select p.user_id, 'Placements'::text as portfolio, p.asset_class, p.symbol, c.label as platform,
  public.to_eur(p.quantity * coalesce(p.last_price, p.avg_cost), p.currency) as value_eur,
  public.to_eur(p.quantity * (coalesce(p.last_price, p.avg_cost) - p.avg_cost), p.currency) as unrealized_eur,
  p.stop_loss, p.take_profit,
  case when p.stop_loss is not null then public.to_eur(greatest(0, (coalesce(p.last_price, p.avg_cost) - p.stop_loss) * p.quantity), p.currency) end as risk_eur,
  case when p.take_profit is not null then public.to_eur(greatest(0, (p.take_profit - coalesce(p.last_price, p.avg_cost)) * p.quantity), p.currency) end as reward_eur
from public.portfolio_positions p left join public.broker_connections c on c.id = p.connection_id
union all
select t.user_id, 'Trading', 'Trading (CFD)', t.symbol, a.broker,
  null::numeric, public.to_eur(t.profit + coalesce(t.swap,0), a.currency),
  t.stop_loss, t.take_profit,
  null::numeric, null::numeric      -- risque CFD : nécessite la taille de contrat du symbole, calculé côté application
from public.active_trades t join public.trading_accounts a on a.id = t.account_id;

-- ============ PnL : latent à date + réalisé sur une période ============
create or replace function public.pnl_summary(start_date date, end_date date)
returns table (portfolio text, asset_class text, unrealized_eur numeric, realized_eur numeric)
language sql stable security invoker as $$
  with lat as (
    select portfolio, asset_class, sum(unrealized_eur) u from public.v_position_risk where user_id = auth.uid() group by 1,2
  ), rea as (
    select 'Trading'::text portfolio, 'Trading (CFD)'::text asset_class,
      sum(public.to_eur(h.profit + coalesce(h.commission,0) + coalesce(h.swap,0), a.currency, h.closed_at::date)) r
    from public.trade_history h join public.trading_accounts a on a.id = h.account_id
    where h.user_id = auth.uid() and h.closed_at::date between start_date and end_date
    union all
    select 'Placements', asset_class, sum(amount_eur) from public.realized_pnl
    where user_id = auth.uid() and realized_on between start_date and end_date group by asset_class
  )
  select coalesce(l.portfolio, r.portfolio), coalesce(l.asset_class, r.asset_class), coalesce(l.u,0), coalesce(sum(r.r),0)
  from lat l full join rea r on r.portfolio = l.portfolio and r.asset_class = l.asset_class
  group by 1,2, l.u
$$;
