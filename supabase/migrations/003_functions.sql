-- Team Tracker Phase 1 — Functions & views

create or replace function public.start_shift()
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  update public.shifts set ended_at = now() where user_id = auth.uid() and ended_at is null;
  insert into public.shifts (user_id) values (auth.uid()) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.end_shift()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.shifts set ended_at = now() where user_id = auth.uid() and ended_at is null;
end;
$$;

-- Live snapshot for the admin map: only currently on-shift employees,
-- each with their most recent location.
create or replace view public.active_employees_view
with (security_invoker = true) as
select
  p.id, p.name, p.email, p.mobile, p.dept, p.zone_id, z.name as zone_name,
  s.id as shift_id, s.started_at,
  l.lat, l.lng, l.recorded_at
from public.profiles p
join public.shifts s on s.user_id = p.id and s.ended_at is null
left join public.zones z on z.id = p.zone_id
left join lateral (
  select lat, lng, recorded_at from public.locations
  where shift_id = s.id order by recorded_at desc limit 1
) l on true
where p.role = 'employee' and p.active = true;
