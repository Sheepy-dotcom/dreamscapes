-- DreamScapes child profile pronouns
-- Run this in the Supabase SQL Editor.
--
-- Until this runs, saving a child profile from a signed-in account fails the
-- cloud write (PostgREST rejects the unknown column) and falls back to saving
-- on the device only, with the "Cloud profile sync needs the child_profiles
-- table" note. Stories are unaffected: the pronoun chosen in the builder is
-- sent straight to the story API and never touches this table.

alter table public.child_profiles
add column if not exists pronouns text;
