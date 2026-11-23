-- FOMO.DESK : schéma complet, toutes les tables préfixées fomodesk_
-- Base partagée avec jamsplans (phase de test) : aucune table jamsplans n'est touchée.
-- Pour la production : exécuter ce même script tel quel sur un projet Supabase dédié.
-- ===== 20261103000000_override_desk.sql =====
-- OVERRIDE.DESK : schéma des flux de données (Supabase / PostgreSQL 15+)
-- Chaque table appartient à un utilisateur (auth.users) et est protégée par RLS.
-- Les écritures des connecteurs passent par les fonctions serveur (clé service_role, qui contourne RLS).

create extension if not exists pgcrypto;

-- ============ Trading spéculatif (MT4 / MT5 / SocialTraderTools) ============
create table if not exists public.fomodesk_trading_accounts (
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

create table if not exists public.fomodesk_active_trades (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.fomodesk_trading_accounts(id) on delete cascade,
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

create table if not exists public.fomodesk_trade_history (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.fomodesk_trading_accounts(id) on delete cascade,
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
create index if not exists trade_history_closed_idx on public.fomodesk_trade_history (user_id, closed_at);

-- ============ Placements et courtiers ============
create table if not exists public.fomodesk_broker_connections (
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

create table if not exists public.fomodesk_portfolio_positions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.fomodesk_broker_connections(id) on delete cascade,
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

create table if not exists public.fomodesk_cash_balances (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.fomodesk_broker_connections(id) on delete cascade,
  account_id    uuid references public.fomodesk_trading_accounts(id) on delete cascade,
  currency      text not null default 'EUR',
  amount        numeric not null,
  updated_at    timestamptz not null default now(),
  check ((connection_id is not null) <> (account_id is not null))
);
create unique index if not exists cash_balances_conn_uq on public.fomodesk_cash_balances (connection_id, currency) where connection_id is not null;
create unique index if not exists cash_balances_acct_uq on public.fomodesk_cash_balances (account_id, currency) where account_id is not null;

create table if not exists public.fomodesk_realized_pnl (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.fomodesk_broker_connections(id) on delete cascade,
  asset_class   text not null,
  symbol        text not null,
  realized_on   date not null,
  amount_eur    numeric not null,
  external_id   text,
  unique (connection_id, external_id)
);
create index if not exists realized_pnl_date_idx on public.fomodesk_realized_pnl (user_id, realized_on);

-- Taux de change journaliers (BCE) pour la conversion en euros
create table if not exists public.fomodesk_fx_rates (
  currency   text not null,              -- devise cotée pour 1 EUR (ex. USD)
  rate_date  date not null,
  rate       numeric not null,
  source     text not null default 'BCE',
  primary key (currency, rate_date)
);

-- ============ Macro et matières premières ============
create table if not exists public.fomodesk_commodity_prices (
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

create table if not exists public.fomodesk_commodity_series (
  series      text not null check (series in ('SPREAD_BRENT_WTI','BASIS_BRENT','BASIS_GOLD','BASIS_SILVER','ZSCORE_SPREAD_60','CORR_CNH_BRENT_20','RATIO_GOLD_SILVER')),
  price_date  date not null,
  value       numeric,
  computed_at timestamptz not null default now(),
  primary key (series, price_date)
);

-- ============ IA connectée : traçabilité ============
create table if not exists public.fomodesk_ai_sources (
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
create index if not exists ai_sources_metric_idx on public.fomodesk_ai_sources (metric, timestamp_retrieved desc);

-- ============ Sécurité : RLS ============
do $$ declare t text; begin
  foreach t in array array['fomodesk_trading_accounts','fomodesk_active_trades','fomodesk_trade_history','fomodesk_broker_connections','fomodesk_portfolio_positions','fomodesk_cash_balances','fomodesk_realized_pnl','fomodesk_ai_sources'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
alter table public.fomodesk_commodity_prices enable row level security;
alter table public.fomodesk_commodity_series enable row level security;
alter table public.fomodesk_fx_rates enable row level security;
drop policy if exists read_all on public.fomodesk_commodity_prices;
drop policy if exists read_all on public.fomodesk_commodity_series;
drop policy if exists read_all on public.fomodesk_fx_rates;
create policy read_all on public.fomodesk_commodity_prices for select using (auth.role() = 'authenticated');
create policy read_all on public.fomodesk_commodity_series for select using (auth.role() = 'authenticated');
create policy read_all on public.fomodesk_fx_rates for select using (auth.role() = 'authenticated');
-- Les identifiants chiffrés ne sont jamais renvoyés au navigateur : colonne retirée du rôle authenticated
revoke all on public.fomodesk_broker_connections from authenticated;
grant select (id, user_id, broker, label, status, last_sync_at, last_error, created_at) on public.fomodesk_broker_connections to authenticated;
grant delete on public.fomodesk_broker_connections to authenticated;

-- ============ Conversion en euros ============
create or replace function public.fomodesk_to_eur(amount numeric, ccy text, on_date date default current_date)
returns numeric language sql stable as $$
  select case when ccy is null or upper(ccy) = 'EUR' then amount
    else amount / nullif((select rate from public.fomodesk_fx_rates f where f.currency = upper(ccy) and f.rate_date <= on_date order by rate_date desc limit 1), 0) end
$$;

-- ============ Risque : SL / TP / RR par ligne ============
drop view if exists public.fomodesk_v_position_risk cascade;
create view public.fomodesk_v_position_risk with (security_invoker = true) as
select p.user_id, 'Placements'::text as portfolio, p.asset_class, p.symbol, c.label as platform,
  public.fomodesk_to_eur(p.quantity * coalesce(p.last_price, p.avg_cost), p.currency) as value_eur,
  public.fomodesk_to_eur(p.quantity * (coalesce(p.last_price, p.avg_cost) - p.avg_cost), p.currency) as unrealized_eur,
  p.stop_loss, p.take_profit,
  case when p.stop_loss is not null then public.fomodesk_to_eur(greatest(0, (coalesce(p.last_price, p.avg_cost) - p.stop_loss) * p.quantity), p.currency) end as risk_eur,
  case when p.take_profit is not null then public.fomodesk_to_eur(greatest(0, (p.take_profit - coalesce(p.last_price, p.avg_cost)) * p.quantity), p.currency) end as reward_eur
from public.fomodesk_portfolio_positions p left join public.fomodesk_broker_connections c on c.id = p.connection_id
union all
select t.user_id, 'Trading', 'Trading (CFD)', t.symbol, a.broker,
  null::numeric, public.fomodesk_to_eur(t.profit + coalesce(t.swap,0), a.currency),
  t.stop_loss, t.take_profit,
  null::numeric, null::numeric      -- risque CFD : nécessite la taille de contrat du symbole, calculé côté application
from public.fomodesk_active_trades t join public.fomodesk_trading_accounts a on a.id = t.account_id;

-- ============ PnL : latent à date + réalisé sur une période ============
create or replace function public.fomodesk_pnl_summary(start_date date, end_date date)
returns table (portfolio text, asset_class text, unrealized_eur numeric, realized_eur numeric)
language sql stable security invoker as $$
  with lat as (
    select portfolio, asset_class, sum(unrealized_eur) u from public.fomodesk_v_position_risk where user_id = auth.uid() group by 1,2
  ), rea as (
    select 'Trading'::text portfolio, 'Trading (CFD)'::text asset_class,
      sum(public.fomodesk_to_eur(h.profit + coalesce(h.commission,0) + coalesce(h.swap,0), a.currency, h.closed_at::date)) r
    from public.fomodesk_trade_history h join public.fomodesk_trading_accounts a on a.id = h.account_id
    where h.user_id = auth.uid() and h.closed_at::date between start_date and end_date
    union all
    select 'Placements', asset_class, sum(amount_eur) from public.fomodesk_realized_pnl
    where user_id = auth.uid() and realized_on between start_date and end_date group by asset_class
  )
  select coalesce(l.portfolio, r.portfolio), coalesce(l.asset_class, r.asset_class), coalesce(l.u,0), coalesce(sum(r.r),0)
  from lat l full join rea r on r.portfolio = l.portfolio and r.asset_class = l.asset_class
  group by 1,2, l.u
$$;

-- ===== 20261103180000_instruments_universe.sql =====
-- v7.0 : le sélecteur universel du volet 5 stocke aussi cuivre, gaz naturel, devises, indices et actions (STK:<ticker>).
alter table public.fomodesk_commodity_prices drop constraint if exists commodity_prices_instrument_check;
alter table public.fomodesk_commodity_prices add constraint commodity_prices_instrument_check
  check (instrument in ('BRENT','WTI','GOLD','SILVER','COPPER','NATGAS','EURUSD','GBPUSD','USDJPY','USDCNH','AUDUSD','USDCAD','SPX','NDX','DJI','DAX','CAC','NKX')
         or instrument ~ '^STK:[A-Z0-9.\-]{1,12}$');

-- ===== 20261103200000_team_versions_nav.sql =====
-- OVERRIDE.DESK v7.2 : espaces de travail partagés, rôles, versions signées, journal d'audit serveur, valorisations quotidiennes.
-- Rejouable. Les écritures sur les versions passent par l'API (clé de service) qui applique la règle des quatre yeux et signe ;
-- le navigateur ne peut que lire ce qui concerne ses espaces.

create table if not exists public.fomodesk_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.fomodesk_workspace_members (
  workspace_id uuid not null references public.fomodesk_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  role text not null check (role in ('admin','analyste','valideur','lecteur')),
  added_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create table if not exists public.fomodesk_workspace_invites (
  workspace_id uuid not null references public.fomodesk_workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','analyste','valideur','lecteur')),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (workspace_id, email)
);
create table if not exists public.fomodesk_plan_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.fomodesk_workspaces(id) on delete cascade,
  module text not null check (module in ('bp','an','lbo')),
  project text not null,
  label text not null,
  data jsonb not null,
  content_hash text not null,                       -- SHA-256 du JSON canonique (clés triées)
  status text not null default 'brouillon' check (status in ('brouillon','soumise','validee','rejetee')),
  author_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  signature text,                                   -- HMAC-SHA256 (SIGNING_KEY serveur) de hash|valideur|date
  comment text,
  constraint four_eyes check (validated_by is null or validated_by <> author_id)
);
create index if not exists plan_versions_ws on public.fomodesk_plan_versions(workspace_id, module, project, created_at desc);
create table if not exists public.fomodesk_audit_events (
  id bigserial primary key,
  workspace_id uuid references public.fomodesk_workspaces(id) on delete restrict,   -- un espace audité ne peut pas être effacé
  user_id uuid not null references auth.users(id),
  at timestamptz not null default now(),
  module text, path text not null, old_value jsonb, new_value jsonb, mode text, version_id uuid
);
create index if not exists audit_events_ws on public.fomodesk_audit_events(workspace_id, at desc);
create table if not exists public.fomodesk_portfolio_nav (
  user_id uuid not null references auth.users(id) on delete cascade,
  nav_date date not null,
  value_eur numeric not null,
  flow_eur numeric not null default 0,
  primary key (user_id, nav_date)
);

-- Appartenance (security definer pour éviter la récursion des politiques)
create or replace function public.fomodesk_ws_role(ws uuid) returns text language sql stable security definer set search_path = public as
$$ select role from public.fomodesk_workspace_members where workspace_id = ws and user_id = auth.uid() $$;

alter table public.fomodesk_workspaces enable row level security;
alter table public.fomodesk_workspace_members enable row level security;
alter table public.fomodesk_workspace_invites enable row level security;
alter table public.fomodesk_plan_versions enable row level security;
alter table public.fomodesk_audit_events enable row level security;
alter table public.fomodesk_portfolio_nav enable row level security;

drop policy if exists ws_read on public.fomodesk_workspaces;
create policy ws_read on public.fomodesk_workspaces for select using (public.fomodesk_ws_role(id) is not null);
drop policy if exists mem_read on public.fomodesk_workspace_members;
create policy mem_read on public.fomodesk_workspace_members for select using (public.fomodesk_ws_role(workspace_id) is not null);
drop policy if exists inv_read on public.fomodesk_workspace_invites;
create policy inv_read on public.fomodesk_workspace_invites for select using (public.fomodesk_ws_role(workspace_id) = 'admin');
drop policy if exists ver_read on public.fomodesk_plan_versions;
create policy ver_read on public.fomodesk_plan_versions for select using (public.fomodesk_ws_role(workspace_id) is not null);
drop policy if exists aud_read on public.fomodesk_audit_events;
create policy aud_read on public.fomodesk_audit_events for select using (public.fomodesk_ws_role(workspace_id) is not null or (workspace_id is null and user_id = auth.uid()));
drop policy if exists nav_own on public.fomodesk_portfolio_nav;
create policy nav_own on public.fomodesk_portfolio_nav for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Le navigateur lit ; toutes les écritures d'équipe passent par l'API.
revoke insert, update, delete on public.fomodesk_workspaces, public.fomodesk_workspace_members, public.fomodesk_workspace_invites, public.fomodesk_plan_versions, public.fomodesk_audit_events from authenticated, anon;
grant select on public.fomodesk_workspaces, public.fomodesk_workspace_members, public.fomodesk_plan_versions, public.fomodesk_audit_events to authenticated;
grant select on public.fomodesk_workspace_invites to authenticated;
grant select, insert, update, delete on public.fomodesk_portfolio_nav to authenticated;

-- Journal d'audit en ajout seul, y compris pour la clé de service
create or replace function public.fomodesk_audit_append_only() returns trigger language plpgsql as
$$ begin raise exception 'journal d''audit en ajout seul'; end $$;
drop trigger if exists audit_no_change on public.fomodesk_audit_events;
create trigger audit_no_change before update or delete on public.fomodesk_audit_events for each row execute function public.fomodesk_audit_append_only();

-- Une version validée est figée : seules les colonnes de statut peuvent évoluer, et jamais les données signées
create or replace function public.fomodesk_version_frozen() returns trigger language plpgsql as
$$ begin
  if old.status = 'validee' and (new.data is distinct from old.data or new.content_hash is distinct from old.content_hash or new.signature is distinct from old.signature) then
    raise exception 'version validée et signée : non modifiable';
  end if; return new; end $$;
drop trigger if exists version_freeze on public.fomodesk_plan_versions;
create trigger version_freeze before update on public.fomodesk_plan_versions for each row execute function public.fomodesk_version_frozen();

-- Droits explicites de la clé de service (déjà accordés par défaut sur Supabase ; utiles hors Supabase)
grant all on public.fomodesk_workspaces, public.fomodesk_workspace_members, public.fomodesk_workspace_invites, public.fomodesk_plan_versions, public.fomodesk_audit_events, public.fomodesk_portfolio_nav to service_role;
grant usage, select on sequence public.fomodesk_audit_events_id_seq to service_role;

-- ===== 20261110000000_ai_cache_v8.sql =====
-- OVERRIDE.DESK v8 : cache des extractions IA par module (lecture à 0 jeton), traçabilité des jetons consommés.
-- Rejouable.
alter table public.fomodesk_ai_sources add column if not exists module        text;
alter table public.fomodesk_ai_sources add column if not exists subject       text;
alter table public.fomodesk_ai_sources add column if not exists cache_key     text;
alter table public.fomodesk_ai_sources add column if not exists payload       jsonb;
alter table public.fomodesk_ai_sources add column if not exists trigger       text;
alter table public.fomodesk_ai_sources add column if not exists input_tokens  integer not null default 0;
alter table public.fomodesk_ai_sources add column if not exists output_tokens integer not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ai_sources_module_chk') then
    alter table public.fomodesk_ai_sources add constraint ai_sources_module_chk check (module is null or module in ('bp','an','cm'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ai_sources_trigger_chk') then
    alter table public.fomodesk_ai_sources add constraint ai_sources_trigger_chk check (trigger is null or trigger in ('recalc','init'));
  end if;
end $$;
create index if not exists ai_sources_cache_idx on public.fomodesk_ai_sources (user_id, cache_key, timestamp_retrieved desc);

-- Dernière extraction par (utilisateur, clé de cache) : ce que lit le front, sans appel au modèle.
drop view if exists public.fomodesk_ai_cache_latest cascade;
create view public.fomodesk_ai_cache_latest with (security_invoker = true) as
  select distinct on (user_id, cache_key) id, user_id, module, subject, cache_key, payload, source_url, source_name,
         timestamp_retrieved, confidence_score, model, trigger, input_tokens, output_tokens
  from public.fomodesk_ai_sources where cache_key is not null
  order by user_id, cache_key, timestamp_retrieved desc;
grant select on public.fomodesk_ai_cache_latest to authenticated;

-- Consommation de jetons par module et par mois (suivi du coût API).
drop view if exists public.fomodesk_ai_usage_monthly cascade;
create view public.fomodesk_ai_usage_monthly with (security_invoker = true) as
  select user_id, module, date_trunc('month', timestamp_retrieved) as month, count(*) as calls,
         sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens
  from public.fomodesk_ai_sources where module is not null group by 1, 2, 3;
grant select on public.fomodesk_ai_usage_monthly to authenticated;

-- ===== 20261112000000_prices_v83.sql =====
-- OVERRIDE.DESK v8.3 : cours du soir des cryptos (CRY:<symbole>) à côté des actions et ETF (STK:<ticker>). Rejouable.
alter table public.fomodesk_commodity_prices drop constraint if exists commodity_prices_instrument_check;
alter table public.fomodesk_commodity_prices add constraint commodity_prices_instrument_check
  check (instrument in ('BRENT','WTI','GOLD','SILVER','COPPER','NATGAS','EURUSD','GBPUSD','USDJPY','USDCNH','AUDUSD','USDCAD','SPX','NDX','DJI','DAX','CAC','NKX')
         or instrument ~ '^STK:[A-Z0-9.\-]{1,12}$' or instrument ~ '^CRY:[A-Z0-9]{1,10}$');

-- ===== 20261112180000_ai_lbo_module.sql =====
-- OVERRIDE.DESK v8.6 : module « lbo » (paramètres de marché des dossiers LBO) dans le cache des recherches IA. Rejouable.
alter table public.fomodesk_ai_sources drop constraint if exists ai_sources_module_chk;
alter table public.fomodesk_ai_sources add constraint ai_sources_module_chk check (module is null or module in ('bp','an','cm','lbo'));

-- ===== 20261112200000_ai_byok_engine.sql =====
-- OVERRIDE.DESK v8.7 : clé Anthropic personnelle (BYOK) chiffrée, moteur utilisé par extraction. Rejouable.
create table if not exists public.fomodesk_ai_user_keys (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  enc_key    text not null,            -- AES-256-GCM (ENCRYPTION_KEY), jamais lisible côté navigateur
  last4      text not null,
  updated_at timestamptz not null default now()
);
alter table public.fomodesk_ai_user_keys enable row level security;   -- aucune politique : accès réservé au rôle service (backend)
revoke all on public.fomodesk_ai_user_keys from anon, authenticated;

alter table public.fomodesk_ai_sources add column if not exists engine text;
alter table public.fomodesk_ai_sources drop constraint if exists ai_sources_engine_chk;
alter table public.fomodesk_ai_sources add constraint ai_sources_engine_chk check (engine is null or engine in ('byok','infra'));

-- Consommation par moteur : seuls les jetons « infra » sont à la charge de l'infrastructure.
drop view if exists public.fomodesk_ai_usage_monthly;
drop view if exists public.fomodesk_ai_usage_monthly cascade;
create view public.fomodesk_ai_usage_monthly with (security_invoker = true) as
  select user_id, module, date_trunc('month', timestamp_retrieved) as month, coalesce(engine, 'infra') as engine, count(*) as calls,
         sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens
  from public.fomodesk_ai_sources where module is not null group by 1, 2, 3, 4;
grant select on public.fomodesk_ai_usage_monthly to authenticated;

-- ===== 20261123000000_connecteur_claude.sql =====
-- v8.17 : connecteur Claude (MCP), file des demandes, instantané du bureau
create table if not exists public.fomodesk_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Claude',
  prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists fomo_keys_user on public.fomodesk_keys(user_id);
create table if not exists public.fomodesk_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  subject text not null,
  query text,
  instructions text not null,
  schema text,
  status text not null default 'pending' check (status in ('pending','claimed','done','applied','error')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  done_at timestamptz
);
create index if not exists fomo_jobs_user_status on public.fomodesk_jobs(user_id, status, created_at);
create table if not exists public.fomodesk_desk (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb,
  updated_at timestamptz not null default now()
);
-- accès uniquement par le serveur (clé service_role) : RLS activée sans politique publique
alter table public.fomodesk_keys enable row level security;
alter table public.fomodesk_jobs enable row level security;
alter table public.fomodesk_desk enable row level security;
