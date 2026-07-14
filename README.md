# Team Tracker — Phase 1

Two apps, one Supabase backend.

```
admin/     React + Vite + Tailwind — dispatcher web dashboard (Vercel)
mobile/    Expo / React Native — employee app (Expo Go)
supabase/  SQL migrations + seed data (run via Supabase SQL editor)
```

## 1. Database

Open your Supabase project → SQL Editor → run these in order:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_rls.sql`
3. `supabase/migrations/003_functions.sql`
4. `supabase/seed.sql` (adds 4 zones)

## 2. Create your first admin

Supabase Dashboard → Authentication → Users → **Add user** (email + password). Copy the generated user ID, then in SQL Editor:

```sql
insert into public.profiles (id, role, name, email)
values ('<paste-user-id>', 'admin', 'Your Name', 'the-email-you-used@example.com');
```

## 3. Admin dashboard

```bash
cd admin
npm install
npm run dev
```

Env is already set in `admin/.env.local`. Deployed version: your Vercel project, env vars set in Vercel dashboard (Settings → Environment Variables) — same two keys as `.env.local`.

## 4. Employee app

```bash
cd mobile
npm install
npx expo start
```

Scan with Expo Go. See `mobile/README.md` for details.

## Schema

| Table | Columns |
|---|---|
| zones | id, name |
| profiles | id, role, name, email, mobile, dept, zone_id, photo_url, active, created_at |
| shifts | id, user_id, started_at, ended_at |
| locations | id, user_id, shift_id, lat, lng, recorded_at |
| sos_broadcasts | id, admin_id, message, created_at |

## RLS

| Table | Employee | Admin |
|---|---|---|
| zones | Read all | Read/write all |
| profiles | Own row read/write | Read all |
| shifts | Own rows only | Read all |
| locations | Own rows only (write); read own | Read all |
| sos_broadcasts | Read all | Read/write own |

## Environments

Dev vs prod = two separate Supabase projects. Point `admin/.env.local` and `mobile/.env.local` at whichever project you're working against. Vercel gets its own env vars in the dashboard (not from the committed file) so production always points at the prod project regardless of what's in git.
