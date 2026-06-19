-- DreamScapes redeem code credits
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

alter table public.profiles
add column if not exists audio_story_credits integer not null default 0;

create table if not exists public.redeem_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  active boolean not null default true,
  audio_story_credits integer not null default 0,
  max_redemptions integer,
  times_redeemed integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.redeem_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  redeem_code_id uuid not null references public.redeem_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_story_credits integer not null default 0,
  redeemed_at timestamptz not null default now(),
  unique (redeem_code_id, user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists redeem_codes_set_updated_at on public.redeem_codes;
create trigger redeem_codes_set_updated_at
before update on public.redeem_codes
for each row execute function public.set_updated_at();

alter table public.redeem_codes enable row level security;
alter table public.redeem_code_redemptions enable row level security;

create index if not exists redeem_codes_code_idx
on public.redeem_codes (code);

create index if not exists redeem_code_redemptions_user_idx
on public.redeem_code_redemptions (user_id, redeemed_at desc);

-- Example: one free audio story, up to 100 redemptions.
-- Change or remove this before launch if you want a different code.
insert into public.redeem_codes (code, description, audio_story_credits, max_redemptions)
values ('FREEAUDIO1', 'One free DreamScapes audio story', 1, 100)
on conflict (code) do update
set
  description = excluded.description,
  audio_story_credits = excluded.audio_story_credits,
  max_redemptions = excluded.max_redemptions,
  active = true;
