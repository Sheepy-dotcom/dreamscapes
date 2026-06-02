-- DreamScapes story timing migration
-- Run this once in Supabase SQL Editor to store generated story word counts.

alter table public.stories
add column if not exists word_count integer;
