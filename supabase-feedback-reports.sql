-- DreamScapes tester feedback reports
-- Run this in Supabase SQL Editor to collect friends and family testing notes.

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  category text not null default 'bug' check (category in ('bug', 'audio', 'story-length', 'idea')),
  message text not null,
  app_screen text,
  story_id uuid references public.stories(id) on delete set null,
  story_title text,
  device_info jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'reviewing', 'done', 'closed')),
  support_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists feedback_reports_set_updated_at on public.feedback_reports;
create trigger feedback_reports_set_updated_at
before update on public.feedback_reports
for each row execute function public.set_updated_at();

alter table public.feedback_reports enable row level security;

drop policy if exists "Users can read own feedback reports" on public.feedback_reports;
create policy "Users can read own feedback reports"
on public.feedback_reports for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own feedback reports" on public.feedback_reports;
create policy "Users can create own feedback reports"
on public.feedback_reports for insert
with check (auth.uid() = user_id);

create index if not exists feedback_reports_user_created_idx
on public.feedback_reports (user_id, created_at desc);

create index if not exists feedback_reports_status_created_idx
on public.feedback_reports (status, created_at desc);
