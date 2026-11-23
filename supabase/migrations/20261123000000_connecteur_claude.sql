-- v8.17 : connecteur Claude (MCP), file des demandes, instantané du bureau
create table if not exists public.fomo_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Claude',
  prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists fomo_keys_user on public.fomo_keys(user_id);
create table if not exists public.fomo_jobs (
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
create index if not exists fomo_jobs_user_status on public.fomo_jobs(user_id, status, created_at);
create table if not exists public.fomo_desk (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb,
  updated_at timestamptz not null default now()
);
-- accès uniquement par le serveur (clé service_role) : RLS activée sans politique publique
alter table public.fomo_keys enable row level security;
alter table public.fomo_jobs enable row level security;
alter table public.fomo_desk enable row level security;
