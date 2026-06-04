-- DreamScapes audio issue reports
-- Run this in Supabase SQL Editor to let users report failed or poor audio.

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

drop trigger if exists audio_issue_reports_set_updated_at on public.audio_issue_reports;
create trigger audio_issue_reports_set_updated_at
before update on public.audio_issue_reports
for each row execute function public.set_updated_at();

alter table public.audio_issue_reports enable row level security;

drop policy if exists "Users can read own audio issue reports" on public.audio_issue_reports;
create policy "Users can read own audio issue reports"
on public.audio_issue_reports for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own audio issue reports" on public.audio_issue_reports;
create policy "Users can create own audio issue reports"
on public.audio_issue_reports for insert
with check (auth.uid() = user_id);

create index if not exists audio_issue_reports_user_created_idx
on public.audio_issue_reports (user_id, created_at desc);

create index if not exists audio_issue_reports_status_created_idx
on public.audio_issue_reports (status, created_at desc);
