-- ============================================================================
-- Team Tracker — Row-Level Security
-- ============================================================================
-- Every table has RLS enabled. Employees can access only their own rows;
-- admins can access everything in their own org. Service role bypasses RLS
-- and is used by scheduled jobs and edge functions only.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: role and org for the current user
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_org()
returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.departments enable row level security;
alter table public.areas enable row level security;
alter table public.profiles enable row level security;
alter table public.shifts enable row level security;
alter table public.locations enable row level security;
alter table public.dispatches enable row level security;
alter table public.sos_pings enable row level security;
alter table public.sos_responses enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;

-- ---------------------------------------------------------------------------
-- organizations: everyone in the org can read
-- ---------------------------------------------------------------------------
create policy "org_read_own" on public.organizations
  for select using (id = public.current_org());

-- ---------------------------------------------------------------------------
-- departments: everyone in org reads; admins write
-- ---------------------------------------------------------------------------
create policy "dept_read_own_org" on public.departments
  for select using (org_id = public.current_org());
create policy "dept_admin_write" on public.departments
  for all using (public.is_admin() and org_id = public.current_org())
       with check (public.is_admin() and org_id = public.current_org());

-- ---------------------------------------------------------------------------
-- areas: everyone in org reads; admins write
-- ---------------------------------------------------------------------------
create policy "area_read_own_org" on public.areas
  for select using (org_id = public.current_org());
create policy "area_admin_write" on public.areas
  for all using (public.is_admin() and org_id = public.current_org())
       with check (public.is_admin() and org_id = public.current_org());

-- ---------------------------------------------------------------------------
-- profiles
--   Employee: read/update own row only
--   Admin:    read all in org, update all in org
-- ---------------------------------------------------------------------------
create policy "profile_read_own" on public.profiles
  for select using (id = auth.uid());
create policy "profile_read_admin_org" on public.profiles
  for select using (public.is_admin() and org_id = public.current_org());
create policy "profile_update_own" on public.profiles
  for update using (id = auth.uid())
       with check (id = auth.uid() and role = 'employee');  -- can't self-promote
create policy "profile_admin_write" on public.profiles
  for all using (public.is_admin() and org_id = public.current_org())
       with check (public.is_admin() and org_id = public.current_org());

-- ---------------------------------------------------------------------------
-- shifts
--   Employee: read/write own shifts
--   Admin:    read all shifts in org
-- ---------------------------------------------------------------------------
create policy "shift_own_all" on public.shifts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "shift_admin_read" on public.shifts
  for select using (
    public.is_admin() and user_id in (select id from public.profiles where org_id = public.current_org())
  );

-- ---------------------------------------------------------------------------
-- locations
--   Employee: write own; read own
--   Admin:    read all in org
-- ---------------------------------------------------------------------------
create policy "location_own_insert" on public.locations
  for insert with check (user_id = auth.uid());
create policy "location_own_read" on public.locations
  for select using (user_id = auth.uid());
create policy "location_admin_read" on public.locations
  for select using (
    public.is_admin() and user_id in (select id from public.profiles where org_id = public.current_org())
  );

-- ---------------------------------------------------------------------------
-- dispatches
--   Employee: read where employee_id = self; update status via RPC only
--   Admin:    read/write own dispatches in org
-- ---------------------------------------------------------------------------
create policy "dispatch_employee_read" on public.dispatches
  for select using (employee_id = auth.uid());
create policy "dispatch_admin_read" on public.dispatches
  for select using (
    public.is_admin() and admin_id in (select id from public.profiles where org_id = public.current_org())
  );
create policy "dispatch_admin_insert" on public.dispatches
  for insert with check (public.is_admin() and admin_id = auth.uid());
create policy "dispatch_admin_update" on public.dispatches
  for update using (public.is_admin() and admin_id = auth.uid());

-- ---------------------------------------------------------------------------
-- sos_pings
--   Admin: read/write own; read all in org
-- ---------------------------------------------------------------------------
create policy "sos_ping_admin_read" on public.sos_pings
  for select using (
    public.is_admin() and admin_id in (select id from public.profiles where org_id = public.current_org())
  );
create policy "sos_ping_admin_write" on public.sos_pings
  for insert with check (public.is_admin() and admin_id = auth.uid());

-- Employees can read pings whose area matches their assigned area or that have no area (broadcast)
create policy "sos_ping_employee_read" on public.sos_pings
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (sos_pings.area_id is null or sos_pings.area_id = p.area_id)
    )
  );

-- ---------------------------------------------------------------------------
-- sos_responses
--   Employee: insert own response only
--   Admin:    read all
-- ---------------------------------------------------------------------------
create policy "sos_resp_employee_insert" on public.sos_responses
  for insert with check (employee_id = auth.uid());
create policy "sos_resp_employee_read_own" on public.sos_responses
  for select using (employee_id = auth.uid());
create policy "sos_resp_admin_read" on public.sos_responses
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- audit_log
--   Admin: read own org's audit trail
--   No one: write directly (only via trigger / service role)
-- ---------------------------------------------------------------------------
create policy "audit_admin_read" on public.audit_log
  for select using (
    public.is_admin() and actor_id in (select id from public.profiles where org_id = public.current_org())
  );

-- ---------------------------------------------------------------------------
-- rate_limits
--   Only service role writes. Users have no direct access.
-- ---------------------------------------------------------------------------
-- (no policies granted = no access for authenticated / anon roles)
