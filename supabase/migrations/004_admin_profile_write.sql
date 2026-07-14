-- Team Tracker Phase 1 — Admin write access to profiles (for zone assignment)
-- Employees can no longer be the ones setting their own zone_id at registration;
-- Admin now needs to be able to update any employee's profile (specifically zone_id).

create policy "profiles_admin_write" on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());
