-- OVERRIDE.DESK v7.2 : espaces de travail partagés, rôles, versions signées, journal d'audit serveur, valorisations quotidiennes.
-- Rejouable. Les écritures sur les versions passent par l'API (clé de service) qui applique la règle des quatre yeux et signe ;
-- le navigateur ne peut que lire ce qui concerne ses espaces.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  role text not null check (role in ('admin','analyste','valideur','lecteur')),
  added_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create table if not exists public.workspace_invites (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','analyste','valideur','lecteur')),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (workspace_id, email)
);
create table if not exists public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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
create index if not exists plan_versions_ws on public.plan_versions(workspace_id, module, project, created_at desc);
create table if not exists public.audit_events (
  id bigserial primary key,
  workspace_id uuid references public.workspaces(id) on delete restrict,   -- un espace audité ne peut pas être effacé
  user_id uuid not null references auth.users(id),
  at timestamptz not null default now(),
  module text, path text not null, old_value jsonb, new_value jsonb, mode text, version_id uuid
);
create index if not exists audit_events_ws on public.audit_events(workspace_id, at desc);
create table if not exists public.portfolio_nav (
  user_id uuid not null references auth.users(id) on delete cascade,
  nav_date date not null,
  value_eur numeric not null,
  flow_eur numeric not null default 0,
  primary key (user_id, nav_date)
);

-- Appartenance (security definer pour éviter la récursion des politiques)
create or replace function public.ws_role(ws uuid) returns text language sql stable security definer set search_path = public as
$$ select role from public.workspace_members where workspace_id = ws and user_id = auth.uid() $$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.plan_versions enable row level security;
alter table public.audit_events enable row level security;
alter table public.portfolio_nav enable row level security;

drop policy if exists ws_read on public.workspaces;
create policy ws_read on public.workspaces for select using (public.ws_role(id) is not null);
drop policy if exists mem_read on public.workspace_members;
create policy mem_read on public.workspace_members for select using (public.ws_role(workspace_id) is not null);
drop policy if exists inv_read on public.workspace_invites;
create policy inv_read on public.workspace_invites for select using (public.ws_role(workspace_id) = 'admin');
drop policy if exists ver_read on public.plan_versions;
create policy ver_read on public.plan_versions for select using (public.ws_role(workspace_id) is not null);
drop policy if exists aud_read on public.audit_events;
create policy aud_read on public.audit_events for select using (public.ws_role(workspace_id) is not null or (workspace_id is null and user_id = auth.uid()));
drop policy if exists nav_own on public.portfolio_nav;
create policy nav_own on public.portfolio_nav for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Le navigateur lit ; toutes les écritures d'équipe passent par l'API.
revoke insert, update, delete on public.workspaces, public.workspace_members, public.workspace_invites, public.plan_versions, public.audit_events from authenticated, anon;
grant select on public.workspaces, public.workspace_members, public.plan_versions, public.audit_events to authenticated;
grant select on public.workspace_invites to authenticated;
grant select, insert, update, delete on public.portfolio_nav to authenticated;

-- Journal d'audit en ajout seul, y compris pour la clé de service
create or replace function public.audit_append_only() returns trigger language plpgsql as
$$ begin raise exception 'journal d''audit en ajout seul'; end $$;
drop trigger if exists audit_no_change on public.audit_events;
create trigger audit_no_change before update or delete on public.audit_events for each row execute function public.audit_append_only();

-- Une version validée est figée : seules les colonnes de statut peuvent évoluer, et jamais les données signées
create or replace function public.version_frozen() returns trigger language plpgsql as
$$ begin
  if old.status = 'validee' and (new.data is distinct from old.data or new.content_hash is distinct from old.content_hash or new.signature is distinct from old.signature) then
    raise exception 'version validée et signée : non modifiable';
  end if; return new; end $$;
drop trigger if exists version_freeze on public.plan_versions;
create trigger version_freeze before update on public.plan_versions for each row execute function public.version_frozen();

-- Droits explicites de la clé de service (déjà accordés par défaut sur Supabase ; utiles hors Supabase)
grant all on public.workspaces, public.workspace_members, public.workspace_invites, public.plan_versions, public.audit_events, public.portfolio_nav to service_role;
grant usage, select on sequence public.audit_events_id_seq to service_role;
