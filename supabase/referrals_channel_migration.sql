-- CoderX referrals + channel verification migration
-- Run this in Supabase → SQL Editor → New query → Run

alter table public.players
  add column if not exists referred_by_telegram_id bigint,
  add column if not exists referral_bonus_remainder integer not null default 0 check (referral_bonus_remainder >= 0 and referral_bonus_remainder < 100),
  add column if not exists referral_bonus_total integer not null default 0 check (referral_bonus_total >= 0),
  add column if not exists first_start_param text;

create index if not exists players_referred_by_idx on public.players (referred_by_telegram_id);

create or replace function public.apply_referral_bonus(
  invitee_telegram_id bigint,
  earned integer
)
returns void
language plpgsql
security definer
as $$
declare
  referrer_id bigint;
  current_remainder integer;
  raw_bonus integer;
  bonus_to_credit integer;
  next_remainder integer;
begin
  if earned <= 0 then
    return;
  end if;

  select referred_by_telegram_id
  into referrer_id
  from public.players
  where telegram_id = invitee_telegram_id;

  if referrer_id is null then
    return;
  end if;

  select referral_bonus_remainder
  into current_remainder
  from public.players
  where telegram_id = referrer_id
  for update;

  if current_remainder is null then
    return;
  end if;

  -- 5% bonus.
  -- For 1 earned point: 5/100 goes into remainder.
  -- After friend earns 20 points, inviter gets +1 whole point.
  raw_bonus := current_remainder + (earned * 5);
  bonus_to_credit := floor(raw_bonus / 100);
  next_remainder := raw_bonus % 100;

  update public.players
  set
    coins = coins + bonus_to_credit,
    referral_bonus_total = referral_bonus_total + bonus_to_credit,
    referral_bonus_remainder = next_remainder
  where telegram_id = referrer_id;
end;
$$;
