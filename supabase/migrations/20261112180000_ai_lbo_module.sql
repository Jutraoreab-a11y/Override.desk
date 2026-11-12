-- OVERRIDE.DESK v8.6 : module « lbo » (paramètres de marché des dossiers LBO) dans le cache des recherches IA. Rejouable.
alter table public.ai_sources drop constraint if exists ai_sources_module_chk;
alter table public.ai_sources add constraint ai_sources_module_chk check (module is null or module in ('bp','an','cm','lbo'));
