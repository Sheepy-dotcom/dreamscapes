-- First-party product analytics for DreamScapes (api/events.js).
--
-- Deliberately minimal: an event name, a little context, and a per-visit id so
-- one journey can be followed from a free story to an account. No IP address,
-- no device fingerprint, nothing that identifies a person or follows anyone
-- between sites - which is what keeps the privacy policy honest and keeps the
-- App Store privacy declarations unchanged.

create table if not exists analytics_events (
  id bigserial primary key,
  name text not null,
  details jsonb not null default '{}'::jsonb,
  -- Random, generated per browser visit and held in sessionStorage, so it dies
  -- with the tab. Enough to join a preview to the account it produced, not
  -- enough to recognise anyone on a later visit.
  visit_id text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_idx on analytics_events (created_at desc);
create index if not exists analytics_events_name_idx on analytics_events (name, created_at desc);
create index if not exists analytics_events_visit_idx on analytics_events (visit_id);

alter table analytics_events enable row level security;
-- Deliberately no policies: only the service role, which bypasses RLS, touches this.

-- Counts per event over a window, so the dashboard does not pull thousands of
-- rows to add them up.
create or replace function analytics_summary(p_days integer default 30)
returns table (name text, total bigint, visits bigint, last_seen timestamptz)
language sql
security definer
set search_path = public
as $$
  select
    e.name,
    count(*) as total,
    count(distinct e.visit_id) as visits,
    max(e.created_at) as last_seen
  from analytics_events e
  where e.created_at >= now() - make_interval(days => greatest(p_days, 1))
  group by e.name
  order by count(*) desc;
$$;

-- How far visitors get through the builder, which is the question the two-step
-- preview was a bet on.
create or replace function analytics_builder_steps(p_days integer default 30)
returns table (step integer, visits bigint)
language sql
security definer
set search_path = public
as $$
  select
    (e.details ->> 'step')::integer as step,
    count(distinct e.visit_id) as visits
  from analytics_events e
  where e.name = 'builder_step_view'
    and e.created_at >= now() - make_interval(days => greatest(p_days, 1))
    and e.details ? 'step'
  group by 1
  order by 1;
$$;

-- Events older than this answer nothing anyone is asking. Run it on a schedule,
-- or by hand now and then.
-- delete from analytics_events where created_at < now() - interval '90 days';
