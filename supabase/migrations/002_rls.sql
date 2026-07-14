-- Team Tracker Phase 1 — Row Level Security
-- Matrix:
--   zones            employee: read all      admin: read/write all
--   profiles         employee: own row r/w   admin: read all
--   shifts           employee: own rows      admin: read all
--   locations        employee: own (write); read own   admin: read all
--   sos_broadcasts   employee: read all      admin: read/write own

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

alter table public.zones enable row level security;
alter table public.profiles enable row level security;
alter table public.shifts enable row level security;
alter table public.locations enable row level security;
alter table public.sos_broadcasts enable row level security;

-- zones
create policy "zones_read_all" on public.zones for select using (true);
create policy "zones_admin_write" on public.zones for all
  using (public.is_admin()) with check (public.is_admin());

-- profiles
create policy "profiles_own_rw" on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_read" on public.profiles for select
  using (public.is_admin());

-- shifts
create policy "shifts_own_rw" on public.shifts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "shifts_admin_read" on public.shifts for select
  using (public.is_admin());

-- locations
create policy "locations_own_insert" on public.locations for insert
  with check (user_id = auth.uid());
create policy "locations_own_read" on public.locations for select
  using (user_id = auth.uid());
create policy "locations_admin_read" on public.locations for select
  using (public.is_admin());

-- sos_broadcasts
create policy "sos_read_all" on public.sos_broadcasts for select using (true);
create policy "sos_admin_write" on public.sos_broadcasts for insert
  with check (public.is_admin() and admin_id = auth.uid());
create policy "sos_admin_manage_own" on public.sos_broadcasts for update
  using (public.is_admin() and admin_id = auth.uid());
