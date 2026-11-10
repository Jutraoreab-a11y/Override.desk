-- OVERRIDE.DESK v8 : cache des extractions IA par module (lecture à 0 jeton), traçabilité des jetons consommés.
-- Rejouable.
alter table public.ai_sources add column if not exists module        text;
alter table public.ai_sources add column if not exists subject       text;
alter table public.ai_sources add column if not exists cache_key     text;
alter table public.ai_sources add column if not exists payload       jsonb;
alter table public.ai_sources add column if not exists trigger       text;
alter table public.ai_sources add column if not exists input_tokens  integer not null default 0;
alter table public.ai_sources add column if not exists output_tokens integer not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ai_sources_module_chk') then
    alter table public.ai_sources add constraint ai_sources_module_chk check (module is null or module in ('bp','an','cm'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ai_sources_trigger_chk') then
    alter table public.ai_sources add constraint ai_sources_trigger_chk check (trigger is null or trigger in ('recalc','init'));
  end if;
end $$;
create index if not exists ai_sources_cache_idx on public.ai_sources (user_id, cache_key, timestamp_retrieved desc);

-- Dernière extraction par (utilisateur, clé de cache) : ce que lit le front, sans appel au modèle.
create or replace view public.ai_cache_latest with (security_invoker = true) as
  select distinct on (user_id, cache_key) id, user_id, module, subject, cache_key, payload, source_url, source_name,
         timestamp_retrieved, confidence_score, model, trigger, input_tokens, output_tokens
  from public.ai_sources where cache_key is not null
  order by user_id, cache_key, timestamp_retrieved desc;
grant select on public.ai_cache_latest to authenticated;

-- Consommation de jetons par module et par mois (suivi du coût API).
create or replace view public.ai_usage_monthly with (security_invoker = true) as
  select user_id, module, date_trunc('month', timestamp_retrieved) as month, count(*) as calls,
         sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens
  from public.ai_sources where module is not null group by 1, 2, 3;
grant select on public.ai_usage_monthly to authenticated;
