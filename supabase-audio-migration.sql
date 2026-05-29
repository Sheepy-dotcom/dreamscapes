-- DreamScapes audio storage migration
-- Run this once in Supabase SQL Editor after creating the private `story-audio` bucket.

alter table public.stories
add column if not exists audio_paths text[] not null default '{}';

alter table public.stories
add column if not exists audio_track_durations numeric[] not null default '{}';

drop policy if exists "Users can upload own story audio" on storage.objects;
create policy "Users can upload own story audio"
on storage.objects for insert
with check (
  bucket_id = 'story-audio'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read own story audio" on storage.objects;
create policy "Users can read own story audio"
on storage.objects for select
using (
  bucket_id = 'story-audio'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own story audio" on storage.objects;
create policy "Users can update own story audio"
on storage.objects for update
using (
  bucket_id = 'story-audio'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'story-audio'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own story audio" on storage.objects;
create policy "Users can delete own story audio"
on storage.objects for delete
using (
  bucket_id = 'story-audio'
  and auth.uid()::text = (storage.foldername(name))[1]
);
