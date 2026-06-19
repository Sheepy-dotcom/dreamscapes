-- DreamScapes profile email tracking
-- Run this in Supabase SQL Editor to make profiles easier to identify.
-- Keep the profile id as the Supabase Auth UUID; use email for human-friendly tracking.

alter table public.profiles
add column if not exists email text;

update public.profiles profile
set email = auth_user.email
from auth.users auth_user
where profile.id = auth_user.id
  and profile.email is distinct from auth_user.email;

create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists sync_profile_email_on_auth_update on auth.users;
create trigger sync_profile_email_on_auth_update
after update of email on auth.users
for each row execute function public.sync_profile_email_from_auth();
