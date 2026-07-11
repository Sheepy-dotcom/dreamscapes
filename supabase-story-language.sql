-- Adds selected story language to saved DreamScapes stories.
-- Run this in Supabase SQL Editor.

alter table public.stories
add column if not exists story_language text not null default 'en-GB';
