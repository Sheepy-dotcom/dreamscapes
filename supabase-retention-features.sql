-- DreamScapes returning-story features.
-- Run this once in Supabase SQL Editor.

alter table public.child_profiles
add column if not exists recurring_characters text;

alter table public.stories
add column if not exists story_summary text,
add column if not exists next_ideas text[] not null default '{}',
add column if not exists occasion text,
add column if not exists recurring_characters text,
add column if not exists series_id text,
add column if not exists series_title text,
add column if not exists chapter_number integer not null default 1,
add column if not exists journey_length integer,
add column if not exists journey_day integer;

create index if not exists stories_user_series_chapter_idx
on public.stories (user_id, series_id, chapter_number);
