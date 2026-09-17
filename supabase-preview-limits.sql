-- Daily counters for the signed-out preview story (api/preview-story.js).
--
-- One row per IP per day. Addresses are stored as a salted SHA-256 hash, never
-- in the clear, and nothing here is ever read back by the app - it exists only
-- to stop an anonymous endpoint running up an OpenAI bill.

create table if not exists preview_usage (
  day date not null default current_date,
  ip_hash text not null,
  count integer not null default 0,
  primary key (day, ip_hash)
);

create index if not exists preview_usage_day_idx on preview_usage (day);

alter table preview_usage enable row level security;
-- Deliberately no policies: only the service role, which bypasses RLS, writes here.

-- Claims one preview slot, or refuses. Returns the counts either way so the
-- endpoint can log how close it is running to the ceiling.
create or replace function claim_preview_slot(
  p_ip_hash text,
  p_ip_limit integer,
  p_global_limit integer
)
returns table (allowed boolean, ip_count integer, global_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := current_date;
  v_ip integer;
  v_global integer;
begin
  -- Serialise claims for the day so simultaneous requests cannot overshoot
  -- the ceiling by reading the same count before either has written.
  perform pg_advisory_xact_lock(hashtext('dreamscapes_preview_' || v_day::text)::bigint);

  select coalesce((select sum(pu.count) from preview_usage pu where pu.day = v_day), 0)::integer
    into v_global;
  select coalesce((select pu.count from preview_usage pu
                    where pu.day = v_day and pu.ip_hash = p_ip_hash), 0)::integer
    into v_ip;

  if v_ip >= p_ip_limit or v_global >= p_global_limit then
    return query select false, v_ip, v_global;
    return;
  end if;

  insert into preview_usage as pu (day, ip_hash, count)
  values (v_day, p_ip_hash, 1)
  on conflict (day, ip_hash) do update set count = pu.count + 1
  returning pu.count into v_ip;

  return query select true, v_ip, v_global + 1;
end;
$$;

-- Yesterday's counters are dead weight; drop them whenever convenient.
-- delete from preview_usage where day < current_date - 1;
