-- Team Tracker — SOS targeting
-- Adds optional targeting to sos_broadcasts: a specific employee, a
-- department, or neither (broadcast to everyone, existing behavior).
-- Only one of target_employee_id / target_dept should be set at a time —
-- enforced in the admin UI, not the DB, to keep this simple.

alter table public.sos_broadcasts
  add column target_employee_id uuid references public.profiles(id) on delete set null,
  add column target_dept text;

-- Employees currently read ALL sos_broadcasts (policy "sos_read_all").
-- Replace it so they only see broadcasts meant for them: untargeted (all),
-- targeted at their own id, or targeted at their own department.
drop policy if exists "sos_read_all" on public.sos_broadcasts;

create policy "sos_read_targeted" on public.sos_broadcasts for select
  using (
    target_employee_id is null and target_dept is null
    or target_employee_id = auth.uid()
    or target_dept = (select dept from public.profiles where id = auth.uid())
  );