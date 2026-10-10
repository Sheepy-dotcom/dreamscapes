-- DreamScapes: everything the live project is still missing, in one run.
--
-- Idempotent: safe to run again, and safe to run when some of it is already
-- there. The select at the end reports what actually exists, because the app
-- cannot tell you - a missing column is dropped from the insert and the save
-- succeeds quietly, and a missing bucket makes covers skip rather than fail.
--
-- Expected result: pronouns_column | art_path_column | art_bucket | art_policies
--                            true  |            true |       true |           4

-- 1. Child profile pronouns.
-- Without it a signed-in parent's profile saves to the device only. Stories
-- are unaffected either way: the builder sends the pronoun straight to the
-- story API without going through this table.
alter table public.child_profiles
add column if not exists pronouns text;

-- 2. Where a story's cover lives.
alter table public.stories
add column if not exists art_path text;

-- 3. The bucket it lives in. Private, like the narration audio: covers are
-- read through signed URLs so one parent's artwork is never served to another.
insert into storage.buckets (id, name, public)
values ('story-art', 'story-art', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload own story art" on storage.objects;
create policy "Users can upload own story art"
on storage.objects for insert
with check (bucket_id = 'story-art' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can replace own story art" on storage.objects;
create policy "Users can replace own story art"
on storage.objects for update
using (bucket_id = 'story-art' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can read own story art" on storage.objects;
create policy "Users can read own story art"
on storage.objects for select
using (bucket_id = 'story-art' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own story art" on storage.objects;
create policy "Users can delete own story art"
on storage.objects for delete
using (bucket_id = 'story-art' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. What is actually there now.
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'child_profiles'
       and column_name = 'pronouns') = 1                      as pronouns_column,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'stories'
       and column_name = 'art_path') = 1                      as art_path_column,
  (select count(*) from storage.buckets where id = 'story-art') = 1 as art_bucket,
  (select count(*) from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname ilike '%story art%')                    as art_policies;
