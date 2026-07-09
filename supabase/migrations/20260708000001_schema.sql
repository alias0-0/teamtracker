-- ============================================================================
-- Team Tracker — Schema
-- ============================================================================
-- Enables auth-linked profiles, org multi-tenancy, PostGIS geo columns,
-- shifts, locations, dispatches, SOS pings, responses, and audit log.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists postgis;
create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------------
-- Organizations (kept simple — single org for POC, extensible for multi-tenant)
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------
create table if not exists public.departments (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color text not null default '#3b82f6'
);
create index if not exists idx_departments_org on public.departments(org_id);

-- ---------------------------------------------------------------------------
-- Areas — geofenced work zones
-- ---------------------------------------------------------------------------
create table if not exists public.areas (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_m integer not null default 500,
  polygon geography(Polygon, 4326)
);
create index if not exists idx_areas_org on public.areas(org_id);
create index if not exists idx_areas_polygon on public.areas using gist(polygon);

-- ---------------------------------------------------------------------------
-- Profiles — one per auth.user
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'employee');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id),
  role public.user_role not null default 'employee',
  name text not null,
  mobile text,
  dept_id uuid references public.departments(id) on delete set null,
  area_id uuid references public.areas(id) on delete set null,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_org on public.profiles(org_id);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_area on public.profiles(area_id);
create unique index if not exists uq_profiles_mobile on public.profiles(mobile) where mobile is not null;

-- ---------------------------------------------------------------------------
-- Shifts
-- ---------------------------------------------------------------------------
create table if not exists public.shifts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_shifts_user on public.shifts(user_id);
create index if not exists idx_shifts_active on public.shifts(user_id) where ended_at is null;

-- ---------------------------------------------------------------------------
-- Locations — high-write, kept lean
-- ---------------------------------------------------------------------------
create table if not exists public.locations (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  point geography(Point, 4326) generated always as (
    st_setsrid(st_makepoint(lng, lat), 4326)::geography
  ) stored,
  accuracy real,
  battery real,
  recorded_at timestamptz not null default now()
);
create index if not exists idx_locations_user_time on public.locations(user_id, recorded_at desc);
create index if not exists idx_locations_shift on public.locations(shift_id);
create index if not exists idx_locations_point on public.locations using gist(point);

-- ---------------------------------------------------------------------------
-- Dispatches
-- ---------------------------------------------------------------------------
create type public.dispatch_status as enum ('pending', 'accepted', 'enroute', 'declined', 'completed');

create table if not exists public.dispatches (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references public.profiles(id),
  employee_id uuid not null references public.profiles(id),
  area_id uuid references public.areas(id),
  message text not null,
  media_url text,
  status public.dispatch_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index if not exists idx_dispatches_employee on public.dispatches(employee_id, created_at desc);
create index if not exists idx_dispatches_admin on public.dispatches(admin_id, created_at desc);
create index if not exists idx_dispatches_status on public.dispatches(status);

-- ---------------------------------------------------------------------------
-- SOS pings + responses
-- ---------------------------------------------------------------------------
create type public.sos_response_type as enum ('accepted', 'declined', 'enroute');

create table if not exists public.sos_pings (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references public.profiles(id),
  area_id uuid references public.areas(id),
  radius_m integer not null default 1000,
  message text not null,
  media_url text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);
create index if not exists idx_sos_admin on public.sos_pings(admin_id, created_at desc);
create index if not exists idx_sos_area on public.sos_pings(area_id);

create table if not exists public.sos_responses (
  ping_id uuid not null references public.sos_pings(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  response public.sos_response_type not null,
  responded_at timestamptz not null default now(),
  primary key (ping_id, employee_id)
);
create index if not exists idx_sos_responses_ping on public.sos_responses(ping_id);

-- ---------------------------------------------------------------------------
-- Audit log — immutable
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id bigserial primary key,
  actor_id uuid not null references public.profiles(id),
  action text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_actor on public.audit_log(actor_id, created_at desc);
create index if not exists idx_audit_action on public.audit_log(action);

-- ---------------------------------------------------------------------------
-- Rate limit buckets (token bucket for OTP/SOS/dispatch)
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket text not null,
  key text not null,
  tokens integer not null,
  updated_at timestamptz not null default now(),
  primary key (bucket, key)
);

-- ---------------------------------------------------------------------------
-- Auto-updated updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
