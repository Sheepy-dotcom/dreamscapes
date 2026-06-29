-- Adds account-synced favourites for saved stories.
-- Run this once in Supabase SQL Editor.

alter table public.stories
add column if not exists is_favourite boolean not null default false;

create index if not exists stories_user_favourite_created_idx
on public.stories (user_id, is_favourite, created_at desc);
