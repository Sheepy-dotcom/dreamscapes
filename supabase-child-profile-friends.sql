-- DreamScapes child profile friends
-- Run this in Supabase SQL Editor to add optional friends to child profiles.

alter table public.child_profiles
add column if not exists friends text;
