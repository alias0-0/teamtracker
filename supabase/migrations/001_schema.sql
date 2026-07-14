-- Team Tracker Phase 1 — Schema
create extension if not exists "uuid-ossp";

create type public.user_role as enum ('employee', 'admin');

create table public.zones (
  id uuid primary key default uuid_generate_v4(),
  name text not null
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'employee',
  name text not null,
  email text not null,
  mobile text,
  dept text,
  zone_id uuid references public.zones(id) on delete set null,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.shifts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index idx_shifts_user on public.shifts(user_id);
create index idx_shifts_active on public.shifts(user_id) where ended_at is null;

create table public.locations (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null default now()
);
create index idx_locations_user_time on public.locations(user_id, recorded_at desc);
create index idx_locations_shift on public.locations(shift_id);

create table public.sos_broadcasts (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references public.profiles(id),
  message text not null,
  created_at timestamptz not null default now()
);
