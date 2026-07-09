-- ============================================================================
-- Team Tracker — RPC functions & views
-- ============================================================================
-- Business logic that runs SECURITY DEFINER so we can enforce invariants
-- (single active shift, valid status transitions, audit-log writes).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- start_shift: end any active shift, start a new one
-- ---------------------------------------------------------------------------
create or replace function public.start_shift()
returns uuid
language plpgsql
security definer set search_path = public as $$
declare
  new_shift_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Close any dangling active shift
  update public.shifts set ended_at = now()
  where user_id = auth.uid() and ended_at is null;

  -- Start new one
  insert into public.shifts (user_id) values (auth.uid())
  returning id into new_shift_id;

  insert into public.audit_log (actor_id, action, target_id, metadata)
  values (auth.uid(), 'shift.start', new_shift_id, '{}'::jsonb);

  return new_shift_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- end_shift: close the caller's active shift
-- ---------------------------------------------------------------------------
create or replace function public.end_shift()
returns void
language plpgsql
security definer set search_path = public as $$
declare
  s_id uuid;
begin
  update public.shifts set ended_at = now()
  where user_id = auth.uid() and ended_at is null
  returning id into s_id;

  if s_id is not null then
    insert into public.audit_log (actor_id, action, target_id, metadata)
    values (auth.uid(), 'shift.end', s_id, '{}'::jsonb);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- respond_dispatch: employee responds to an assignment
-- ---------------------------------------------------------------------------
create or replace function public.respond_dispatch(
  dispatch_id uuid,
  response public.dispatch_status
)
returns void
language plpgsql
security definer set search_path = public as $$
begin
  update public.dispatches
  set status = response, responded_at = now()
  where id = dispatch_id and employee_id = auth.uid();

  if not found then
    raise exception 'Dispatch not found or not assigned to you';
  end if;

  insert into public.audit_log (actor_id, action, target_id, metadata)
  values (auth.uid(), 'dispatch.respond', dispatch_id,
          jsonb_build_object('response', response::text));
end;
$$;

-- ---------------------------------------------------------------------------
-- respond_sos: employee acknowledges an SOS ping
-- ---------------------------------------------------------------------------
create or replace function public.respond_sos(
  ping_id uuid,
  response public.sos_response_type
)
returns void
language plpgsql
security definer set search_path = public as $$
begin
  insert into public.sos_responses (ping_id, employee_id, response)
  values (ping_id, auth.uid(), response)
  on conflict (ping_id, employee_id)
  do update set response = excluded.response, responded_at = now();

  insert into public.audit_log (actor_id, action, target_id, metadata)
  values (auth.uid(), 'sos.respond', ping_id,
          jsonb_build_object('response', response::text));
end;
$$;

-- ---------------------------------------------------------------------------
-- View: active_employees_view
-- Denormalized live snapshot used by the admin map.
-- ---------------------------------------------------------------------------
create or replace view public.active_employees_view
with (security_invoker = true) as
select
  p.id,
  p.name,
  p.role,
  p.dept_id,
  p.area_id,
  p.photo_url,
  s.id as shift_id,
  l.lat as last_lat,
  l.lng as last_lng,
  l.battery as last_battery,
  l.recorded_at as last_seen_at,
  case
    when l.recorded_at is null or l.recorded_at < now() - interval '15 minutes' then 'offline'
    when exists (
      select 1 from public.dispatches d
      where d.employee_id = p.id and d.status in ('accepted', 'enroute')
    ) then 'enroute'
    when exists (
      select 1 from public.dispatches d
      where d.employee_id = p.id and d.status = 'accepted'
    ) then 'busy'
    else 'available'
  end as status
from public.profiles p
join public.shifts s on s.user_id = p.id and s.ended_at is null
left join lateral (
  select lat, lng, battery, recorded_at
  from public.locations
  where user_id = p.id and shift_id = s.id
  order by recorded_at desc
  limit 1
) l on true
where p.role = 'employee' and p.active = true;

-- ---------------------------------------------------------------------------
-- View: recent_activity_view
-- Combines dispatch, SOS, and battery events into a single feed for admins.
-- ---------------------------------------------------------------------------
create or replace view public.recent_activity_view
with (security_invoker = true) as
  select
    'dispatch.' || d.status::text as kind,
    d.id::text as ref_id,
    p.name || ' — ' || d.status::text as label,
    d.responded_at as at,
    d.employee_id as actor_id
  from public.dispatches d
  join public.profiles p on p.id = d.employee_id
  where d.responded_at is not null
union all
  select
    'sos.respond' as kind,
    r.ping_id::text as ref_id,
    p.name || ' — ' || r.response::text as label,
    r.responded_at as at,
    r.employee_id as actor_id
  from public.sos_responses r
  join public.profiles p on p.id = r.employee_id
order by at desc
limit 50;
