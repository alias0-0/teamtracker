-- ============================================================================
-- Team Tracker — Location simulator & retention
-- ============================================================================
-- The simulator moves each on-shift employee slightly every 15 seconds so
-- the admin map "lives" without any real devices. Toggle by disabling the
-- cron job. Retention runs daily and purges locations older than 30 days.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Simulator: insert a small random walk step per active shift
-- ---------------------------------------------------------------------------
create or replace function public.simulate_locations()
returns void
language plpgsql
security definer set search_path = public as $$
begin
  insert into public.locations (user_id, shift_id, lat, lng, battery, accuracy)
  select
    p.id,
    s.id,
    coalesce(l.lat, a.center_lat) + (random() - 0.5) * 0.0006,
    coalesce(l.lng, a.center_lng) + (random() - 0.5) * 0.0006,
    greatest(0, coalesce(l.battery, 100) - (random() * 0.15)::real),
    (60 + random() * 40)::real
  from public.profiles p
  join public.shifts s on s.user_id = p.id and s.ended_at is null
  left join public.areas a on a.id = p.area_id
  left join lateral (
    select lat, lng, battery
    from public.locations
    where shift_id = s.id
    order by recorded_at desc
    limit 1
  ) l on true
  where p.role = 'employee' and p.active = true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Retention: purge locations older than 30 days
-- ---------------------------------------------------------------------------
create or replace function public.purge_old_locations()
returns void
language plpgsql
security definer set search_path = public as $$
begin
  delete from public.locations where recorded_at < now() - interval '30 days';
  delete from public.audit_log where created_at < now() - interval '90 days';
end;
$$;

-- ---------------------------------------------------------------------------
-- Schedule the jobs (safe to re-run: unschedule first)
-- ---------------------------------------------------------------------------
do $$
begin
  perform cron.unschedule(jobname)
  from cron.job
  where jobname in ('team-tracker-simulate', 'team-tracker-purge');
exception when others then null;
end $$;

select cron.schedule(
  'team-tracker-simulate',
  '15 seconds',
  $$select public.simulate_locations();$$
);

select cron.schedule(
  'team-tracker-purge',
  '0 3 * * *',   -- 03:00 daily
  $$select public.purge_old_locations();$$
);

-- ---------------------------------------------------------------------------
-- Rate limiter helper (token bucket)
-- ---------------------------------------------------------------------------
create or replace function public.rate_limit_take(
  p_bucket text,
  p_key text,
  p_max integer,
  p_refill_seconds integer
)
returns boolean
language plpgsql
security definer set search_path = public as $$
declare
  cur_tokens integer;
  last_at timestamptz;
  refill integer;
begin
  select tokens, updated_at into cur_tokens, last_at
  from public.rate_limits where bucket = p_bucket and key = p_key
  for update;

  if not found then
    insert into public.rate_limits (bucket, key, tokens)
    values (p_bucket, p_key, p_max - 1);
    return true;
  end if;

  refill := floor(extract(epoch from (now() - last_at)) / p_refill_seconds)::int;
  cur_tokens := least(p_max, cur_tokens + refill);
  if cur_tokens <= 0 then
    return false;
  end if;

  update public.rate_limits
    set tokens = cur_tokens - 1, updated_at = now()
    where bucket = p_bucket and key = p_key;
  return true;
end;
$$;
