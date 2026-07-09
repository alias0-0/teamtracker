-- ============================================================================
-- Team Tracker — Seed data
-- ============================================================================
-- Runs after all migrations. Creates one organization, a few departments,
-- four areas around Al Khobar, and eight demo employees. Actual auth.users
-- must be created via the Supabase dashboard or the JS client — this file
-- only inserts the linked profile rows.
-- ============================================================================

-- The org ID is a fixed UUID used across dev/prod for consistency.
insert into public.organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Al Khobar Field Services')
on conflict (id) do nothing;

insert into public.departments (id, org_id, name, color) values
  ('11111111-1111-1111-1111-111111111001', '00000000-0000-0000-0000-000000000001', 'HVAC', '#3b82f6'),
  ('11111111-1111-1111-1111-111111111002', '00000000-0000-0000-0000-000000000001', 'Electrical', '#f59e0b'),
  ('11111111-1111-1111-1111-111111111003', '00000000-0000-0000-0000-000000000001', 'Plumbing', '#ec4899'),
  ('11111111-1111-1111-1111-111111111004', '00000000-0000-0000-0000-000000000001', 'Field Tech', '#a855f7')
on conflict (id) do nothing;

insert into public.areas (id, org_id, name, center_lat, center_lng, radius_m) values
  ('22222222-2222-2222-2222-222222222001', '00000000-0000-0000-0000-000000000001', 'Al Khobar Central', 26.2172, 50.1971, 800),
  ('22222222-2222-2222-2222-222222222002', '00000000-0000-0000-0000-000000000001', 'Al Aqrabiyah',     26.2760, 50.1994, 700),
  ('22222222-2222-2222-2222-222222222003', '00000000-0000-0000-0000-000000000001', 'Dhahran',          26.2361, 50.1039, 900),
  ('22222222-2222-2222-2222-222222222004', '00000000-0000-0000-0000-000000000001', 'Al Rakah',         26.3200, 50.1900, 600)
on conflict (id) do nothing;

-- NOTE: profiles reference auth.users(id). You must first create auth users.
-- Do that from a script or the Supabase dashboard, then edit these IDs to match
-- the real auth user IDs, or use the seed-users.mjs helper in scripts/.

-- Example placeholder profiles (uncomment & set real IDs after creating auth users):
-- insert into public.profiles (id, org_id, role, name, mobile, dept_id, area_id) values
--   ('<admin-auth-user-id>',    '00000000-0000-0000-0000-000000000001', 'admin',    'Sami Al-Ahmadi',      '+966500000001', null, null),
--   ('<emp-1-auth-user-id>',    '00000000-0000-0000-0000-000000000001', 'employee', 'Ahmed Al-Rashid',     '+966500000002', '11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222001'),
--   ('<emp-2-auth-user-id>',    '00000000-0000-0000-0000-000000000001', 'employee', 'Sarah Ibrahim',       '+966500000003', '11111111-1111-1111-1111-111111111004', '22222222-2222-2222-2222-222222222002'),
--   ('<emp-3-auth-user-id>',    '00000000-0000-0000-0000-000000000001', 'employee', 'Omar Hassan',         '+966500000004', '11111111-1111-1111-1111-111111111002', '22222222-2222-2222-2222-222222222003'),
--   ('<emp-4-auth-user-id>',    '00000000-0000-0000-0000-000000000001', 'employee', 'Fatima Al-Zahrani',   '+966500000005', '11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222001'),
--   ('<emp-5-auth-user-id>',    '00000000-0000-0000-0000-000000000001', 'employee', 'Khalid Bin Salman',   '+966500000006', '11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222004'),
--   ('<emp-6-auth-user-id>',    '00000000-0000-0000-0000-000000000001', 'employee', 'Maryam Al-Otaibi',    '+966500000007', '11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222002'),
--   ('<emp-7-auth-user-id>',    '00000000-0000-0000-0000-000000000001', 'employee', 'Yusuf Rahman',        '+966500000008', '11111111-1111-1111-1111-111111111002', '22222222-2222-2222-2222-222222222001'),
--   ('<emp-8-auth-user-id>',    '00000000-0000-0000-0000-000000000001', 'employee', 'Layla Ahmed',         '+966500000009', '11111111-1111-1111-1111-111111111004', '22222222-2222-2222-2222-222222222003');
