-- Team Tracker — Shift Scheduling
-- Admin pre-assigns when an employee is expected to work.
-- One employee can have multiple schedule rows (their upcoming shifts);
-- this does not replace start_shift()/end_shift() — those still work
-- independently, this is informational scheduling only for now.

create table public.shift_schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.profiles(id) on delete cascade not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now(),
  constraint schedule_end_after_start check (scheduled_end > scheduled_start)
);

alter table public.shift_schedules enable row level security;

create policy "shift_schedules_own_read" on public.shift_schedules for select
  using (employee_id = auth.uid());

create policy "shift_schedules_admin_all" on public.shift_schedules for all
  using (public.is_admin())
  with check (public.is_admin());
