-- OVERRIDE.DESK v8.7 : clé Anthropic personnelle (BYOK) chiffrée, moteur utilisé par extraction. Rejouable.
create table if not exists public.ai_user_keys (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  enc_key    text not null,            -- AES-256-GCM (ENCRYPTION_KEY), jamais lisible côté navigateur
  last4      text not null,
  updated_at timestamptz not null default now()
);
alter table public.ai_user_keys enable row level security;   -- aucune politique : accès réservé au rôle service (backend)
revoke all on public.ai_user_keys from anon, authenticated;

alter table public.ai_sources add column if not exists engine text;
alter table public.ai_sources drop constraint if exists ai_sources_engine_chk;
alter table public.ai_sources add constraint ai_sources_engine_chk check (engine is null or engine in ('byok','infra'));

-- Consommation par moteur : seuls les jetons « infra » sont à la charge de l'infrastructure.
drop view if exists public.ai_usage_monthly;
create view public.ai_usage_monthly with (security_invoker = true) as
  select user_id, module, date_trunc('month', timestamp_retrieved) as month, coalesce(engine, 'infra') as engine, count(*) as calls,
         sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens
  from public.ai_sources where module is not null group by 1, 2, 3, 4;
grant select on public.ai_usage_monthly to authenticated;
