-- CoderX Supabase schema
-- Run this in Supabase -> SQL Editor -> New query -> Run

create table if not exists public.players (
  id bigserial primary key,
  telegram_id bigint unique not null,
  username text,
  first_name text,
  wallet_address text,
  coins integer not null default 0 check (coins >= 0),
  energy integer not null default 100 check (energy >= 0 and energy <= 100),
  last_energy_at timestamptz not null default now(),
  level integer not null default 1,
  xp integer not null default 0,
  tasks jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists players_telegram_id_idx on public.players (telegram_id);
create index if not exists players_coins_idx on public.players (coins desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists players_set_updated_at on public.players;

create trigger players_set_updated_at
before update on public.players
for each row
execute function public.set_updated_at();

alter table public.players enable row level security;

-- No public RLS policies are added.
-- The frontend does not write to Supabase directly.
-- Vercel API functions use SUPABASE_SERVICE_ROLE_KEY on the server.
