-- DreamScapes sign-up resilience
-- Run this in the Supabase SQL Editor.
--
-- Sign-up was reported failing with "Database error saving new user" while the
-- account still appeared in Supabase. That message means the AFTER INSERT
-- trigger on auth.users raised, and because it raised, GoTrue reported the
-- whole sign-up as failed - so a parent who actually had an account was told
-- they did not, and trying again gives "already registered".
--
-- A profile row is convenient, not essential: lib/auth.js already falls back to
-- a free plan when the row is missing, and now creates it on the first API
-- call. So this trigger has no business failing a sign-up. It now swallows its
-- own error and records it with RAISE WARNING, which lands in
-- Supabase > Logs > Postgres with the real SQLSTATE - the diagnosis stays
-- available, it just stops taking the front door down with it.

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do update
      set email = excluded.email;
  exception
    when others then
      -- Never block the sign-up. The row is recoverable; the account is not.
      raise warning 'create_profile_for_new_user failed for % (%): % [%]',
        new.id, new.email, sqlerrm, sqlstate;
  end;

  return new;
end;
$$;

-- Same reasoning for the email sync: a profile row that will not take an email
-- update is not a reason to refuse somebody a change of address.
create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    update public.profiles
    set email = new.email
    where id = new.id;
  exception
    when others then
      raise warning 'sync_profile_email_from_auth failed for % (%): % [%]',
        new.id, new.email, sqlerrm, sqlstate;
  end;

  return new;
end;
$$;

-- Backfill anyone who signed up while the trigger was failing. They have an
-- auth user and no profile, which costs them a RevenueCat entitlement: the
-- webhook updates profiles.plan by id and would match no row.
--
-- Wrapped, because whatever has been breaking the trigger will break this the
-- same way - and an unwrapped failure here would abort the script and take the
-- two function definitions above with it. This way the functions land either
-- way, and the error prints as a NOTICE: that text is the root cause nobody
-- has seen yet, so copy it out if it appears.
do $$
declare
  added integer := 0;
begin
  insert into public.profiles (id, email)
  select auth_user.id, auth_user.email
  from auth.users auth_user
  left join public.profiles profile on profile.id = auth_user.id
  where profile.id is null
  on conflict (id) do nothing;

  get diagnostics added = row_count;
  raise notice 'Backfilled % missing profile row(s).', added;
exception
  when others then
    raise notice 'Backfill failed: % [%] - this is the same fault that was breaking sign-up.', sqlerrm, sqlstate;
end;
$$;
