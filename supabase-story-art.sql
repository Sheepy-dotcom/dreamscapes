-- DreamScapes story covers
-- Run this in the Supabase SQL Editor, then create the bucket below.
--
-- Two steps, and both are needed before covers appear:
--
-- 1. The column. Until this runs, a story saves without its cover path and the
--    library falls back to the bundled artwork - no error, just no cover.
alter table public.stories
add column if not exists art_path text;

-- 2. The bucket. Storage > New bucket > name it exactly "story-art", PRIVATE
--    (not public): covers are read through signed URLs, the same way narration
--    audio is. Then run the policies below so a parent can write and read
--    their own folder and nobody else's.

insert into storage.buckets (id, name, public)
values ('story-art', 'story-art', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload own story art" on storage.objects;
create policy "Users can upload own story art"
on storage.objects for insert
with check (
  bucket_id = 'story-art'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can replace own story art" on storage.objects;
create policy "Users can replace own story art"
on storage.objects for update
using (
  bucket_id = 'story-art'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can read own story art" on storage.objects;
create policy "Users can read own story art"
on storage.objects for select
using (
  bucket_id = 'story-art'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own story art" on storage.objects;
create policy "Users can delete own story art"
on storage.objects for delete
using (
  bucket_id = 'story-art'
  and (storage.foldername(name))[1] = auth.uid()::text
);
