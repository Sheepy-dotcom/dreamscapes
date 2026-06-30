-- DreamScapes child profiles
-- Run this in Supabase SQL Editor to enable saved child profiles on accounts.

create table if not exists public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_name text not null,
  child_age text,
  eye_colour text,
  hair_colour text,
  parent_names text,
  interests text,
  friends text,
  recurring_characters text,
  avoid_topics text,
  other_details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.child_profiles
add column if not exists friends text;

alter table public.child_profiles
add column if not exists recurring_characters text;

drop trigger if exists child_profiles_set_updated_at on public.child_profiles;
create trigger child_profiles_set_updated_at
before update on public.child_profiles
for each row execute function public.set_updated_at();

alter table public.child_profiles enable row level security;

drop policy if exists "Users can read own child profiles" on public.child_profiles;
create policy "Users can read own child profiles"
on public.child_profiles for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own child profiles" on public.child_profiles;
create policy "Users can create own child profiles"
on public.child_profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own child profiles" on public.child_profiles;
create policy "Users can update own child profiles"
on public.child_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own child profiles" on public.child_profiles;
create policy "Users can delete own child profiles"
on public.child_profiles for delete
using (auth.uid() = user_id);

create index if not exists child_profiles_user_created_idx
on public.child_profiles (user_id, created_at desc);
