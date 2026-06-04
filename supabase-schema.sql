-- DreamScapes Supabase schema
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'premier', 'plus')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  child_name text not null,
  child_age text,
  story_type text not null check (story_type in ('bedtime', 'anytime')),
  duration_minutes integer not null,
  moods text[] not null default '{}',
  story_idea text,
  paragraphs jsonb not null,
  word_count integer,
  plan text not null default 'free' check (plan in ('free', 'premier', 'plus')),
  voice_style text,
  audio_requested boolean not null default false,
  audio_paths text[] not null default '{}',
  audio_track_durations numeric[] not null default '{}',
  audio_duration_seconds numeric,
  audio_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,
  stories_created integer not null default 0,
  audio_seconds_used numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_key)
);

create table if not exists public.audio_issue_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid references public.stories(id) on delete set null,
  story_title text not null,
  voice_style text,
  duration_minutes numeric,
  audio_duration_seconds numeric,
  source text not null default 'result',
  message text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'credited', 'closed')),
  support_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists stories_set_updated_at on public.stories;
create trigger stories_set_updated_at
before update on public.stories
for each row execute function public.set_updated_at();

drop trigger if exists usage_months_set_updated_at on public.usage_months;
create trigger usage_months_set_updated_at
before update on public.usage_months
for each row execute function public.set_updated_at();

drop trigger if exists audio_issue_reports_set_updated_at on public.audio_issue_reports;
create trigger audio_issue_reports_set_updated_at
before update on public.audio_issue_reports
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_on_signup on auth.users;
create trigger create_profile_on_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.usage_months enable row level security;
alter table public.audio_issue_reports enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own stories" on public.stories;
create policy "Users can read own stories"
on public.stories for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own stories" on public.stories;
create policy "Users can create own stories"
on public.stories for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own stories" on public.stories;
create policy "Users can update own stories"
on public.stories for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own stories" on public.stories;
create policy "Users can delete own stories"
on public.stories for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own usage" on public.usage_months;
create policy "Users can read own usage"
on public.usage_months for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own usage" on public.usage_months;
create policy "Users can create own usage"
on public.usage_months for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own usage" on public.usage_months;
create policy "Users can update own usage"
on public.usage_months for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own audio issue reports" on public.audio_issue_reports;
create policy "Users can read own audio issue reports"
on public.audio_issue_reports for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own audio issue reports" on public.audio_issue_reports;
create policy "Users can create own audio issue reports"
on public.audio_issue_reports for insert
with check (auth.uid() = user_id);

create index if not exists stories_user_created_idx
on public.stories (user_id, created_at desc);

create index if not exists usage_months_user_month_idx
on public.usage_months (user_id, month_key);

create index if not exists audio_issue_reports_user_created_idx
on public.audio_issue_reports (user_id, created_at desc);

create index if not exists audio_issue_reports_status_created_idx
on public.audio_issue_reports (status, created_at desc);

alter table public.stories
add column if not exists audio_requested boolean not null default false;

alter table public.stories
add column if not exists audio_paths text[] not null default '{}';

alter table public.stories
add column if not exists audio_track_durations numeric[] not null default '{}';

drop policy if exists "Users can upload own story audio" on storage.objects;
create policy "Users can upload own story audio"
on storage.objects for insert
with check (
  bucket_id = 'story-audio'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read own story audio" on storage.objects;
create policy "Users can read own story audio"
on storage.objects for select
using (
  bucket_id = 'story-audio'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own story audio" on storage.objects;
create policy "Users can update own story audio"
on storage.objects for update
using (
  bucket_id = 'story-audio'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'story-audio'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own story audio" on storage.objects;
create policy "Users can delete own story audio"
on storage.objects for delete
using (
  bucket_id = 'story-audio'
  and auth.uid()::text = (storage.foldername(name))[1]
);
