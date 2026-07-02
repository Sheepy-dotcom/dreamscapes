-- DreamScapes user email tracking for all user-owned public tables.
-- Run this once in Supabase SQL Editor.
--
-- The Auth UUID remains the real relationship key. This migration adds a
-- human-readable user_email copy to every public base table with user_id.
-- public.profiles already stores the address in its email column.

create or replace function public.set_user_email_from_user_id()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  select coalesce(profile.email, auth_user.email)
  into new.user_email
  from auth.users auth_user
  left join public.profiles profile on profile.id = auth_user.id
  where auth_user.id = new.user_id;

  return new;
end;
$$;

do $$
declare
  target_table record;
  email_index_name text;
begin
  for target_table in
    select column_info.table_name
    from information_schema.columns column_info
    join information_schema.tables table_info
      on table_info.table_schema = column_info.table_schema
     and table_info.table_name = column_info.table_name
    where column_info.table_schema = 'public'
      and column_info.column_name = 'user_id'
      and table_info.table_type = 'BASE TABLE'
    order by column_info.table_name
  loop
    execute format(
      'alter table public.%I add column if not exists user_email text',
      target_table.table_name
    );

    execute format(
      'update public.%I target
       set user_email = coalesce(profile.email, auth_user.email)
       from auth.users auth_user
       left join public.profiles profile on profile.id = auth_user.id
       where target.user_id = auth_user.id
         and target.user_email is distinct from coalesce(profile.email, auth_user.email)',
      target_table.table_name
    );

    execute format(
      'drop trigger if exists set_user_email_from_user_id on public.%I',
      target_table.table_name
    );

    execute format(
      'create trigger set_user_email_from_user_id
       before insert or update of user_id on public.%I
       for each row execute function public.set_user_email_from_user_id()',
      target_table.table_name
    );

    email_index_name := target_table.table_name || '_user_email_idx';
    execute format(
      'create index if not exists %I on public.%I (user_email)',
      email_index_name,
      target_table.table_name
    );
  end loop;
end;
$$;

-- Keep profiles and all copied user_email values current if an Auth email changes.
create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_table record;
begin
  update public.profiles
  set email = new.email
  where id = new.id
    and email is distinct from new.email;

  for target_table in
    select column_info.table_name
    from information_schema.columns column_info
    join information_schema.tables table_info
      on table_info.table_schema = column_info.table_schema
     and table_info.table_name = column_info.table_name
    where column_info.table_schema = 'public'
      and column_info.column_name = 'user_id'
      and table_info.table_type = 'BASE TABLE'
    order by column_info.table_name
  loop
    execute format(
      'update public.%I
       set user_email = $1
       where user_id = $2
         and user_email is distinct from $1',
      target_table.table_name
    ) using new.email, new.id;
  end loop;

  return new;
end;
$$;

drop trigger if exists sync_profile_email_on_auth_update on auth.users;
create trigger sync_profile_email_on_auth_update
after update of email on auth.users
for each row execute function public.sync_profile_email_from_auth();

-- Confirm which tables now expose a user_email column.
select column_info.table_name, column_info.column_name
from information_schema.columns column_info
where column_info.table_schema = 'public'
  and (
    column_info.column_name = 'user_email'
    or (column_info.table_name = 'profiles' and column_info.column_name = 'email')
  )
order by column_info.table_name, column_info.column_name;
