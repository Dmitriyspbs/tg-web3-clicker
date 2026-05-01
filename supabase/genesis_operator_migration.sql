-- CoderX Genesis Operator migration
-- Run this in Supabase → SQL Editor → New query → Run
--
-- What this does:
-- 1. Adds Genesis fields to players
-- 2. Gives first 100 players Genesis Operator status
-- 3. Gives each Genesis Operator +5000 CXR once
-- 4. Automatically assigns Genesis status to new players until 100 total Genesis Operators exist

alter table public.players
  add column if not exists is_genesis_operator boolean not null default false,
  add column if not exists genesis_number integer unique,
  add column if not exists genesis_assigned_at timestamptz,
  add column if not exists genesis_bonus_claimed boolean not null default false;

create sequence if not exists public.genesis_operator_seq start 1;

-- Assign Genesis status to existing first 100 players.
with ranked as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as rn
  from public.players
  order by created_at asc, id asc
  limit 100
)
update public.players p
set
  is_genesis_operator = true,
  genesis_number = ranked.rn,
  genesis_assigned_at = coalesce(p.genesis_assigned_at, now())
from ranked
where p.id = ranked.id
  and p.genesis_number is null;

-- One-time Genesis bonus.
update public.players
set
  coins = coins + 5000,
  genesis_bonus_claimed = true
where is_genesis_operator = true
  and genesis_bonus_claimed = false;

-- Keep sequence aligned with current Genesis numbers.
do $$
declare
  max_number integer;
begin
  select coalesce(max(genesis_number), 0)
  into max_number
  from public.players;

  if max_number = 0 then
    perform setval('public.genesis_operator_seq', 1, false);
  else
    perform setval('public.genesis_operator_seq', max_number, true);
  end if;
end $$;

create or replace function public.assign_genesis_operator()
returns trigger
language plpgsql
as $$
declare
  next_number integer;
begin
  if new.is_genesis_operator = true or new.genesis_number is not null then
    return new;
  end if;

  -- If there are already 100 Genesis Operators, do nothing.
  if (select count(*) from public.players where is_genesis_operator = true) >= 100 then
    return new;
  end if;

  next_number := nextval('public.genesis_operator_seq');

  if next_number <= 100 then
    new.is_genesis_operator := true;
    new.genesis_number := next_number;
    new.genesis_assigned_at := now();
    new.coins := coalesce(new.coins, 0) + 5000;
    new.genesis_bonus_claimed := true;
  end if;

  return new;
end;
$$;

drop trigger if exists players_assign_genesis_operator on public.players;

create trigger players_assign_genesis_operator
before insert on public.players
for each row
execute function public.assign_genesis_operator();
