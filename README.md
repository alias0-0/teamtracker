# Team Tracker

Field workforce dispatch — admin dashboard + employee mobile web view.

**Stack:** React 18 · TypeScript · Vite · Tailwind v4 · TanStack Query · React Router · Supabase (Postgres + PostGIS + Auth + Realtime + Edge Functions)

---

## Quick start

```bash
pnpm install
pnpm dev
```

App opens at http://localhost:5173. `.env.local` is already committed with your Supabase creds baked in for local dev (see security note below).

## First-time Supabase setup

1. Install Supabase CLI:
   ```bash
   npm i -g supabase
   ```

2. Link this repo to your Supabase project:
   ```bash
   supabase login
   supabase link --project-ref pmtnyyzvjtxfoycbtvtn
   ```

3. Push all migrations:
   ```bash
   supabase db push
   ```

4. Seed org + departments + areas:
   ```bash
   psql "$(supabase status --output json | jq -r .DB_URL)" -f supabase/seed.sql
   ```
   Or paste the contents of `supabase/seed.sql` into the SQL editor at https://supabase.com/dashboard/project/pmtnyyzvjtxfoycbtvtn/sql

5. Create your first admin user in the Supabase dashboard → Authentication → Users → **Add user** → set email + password. Note the user ID it gives you.

6. Insert a matching profile row (SQL editor):
   ```sql
   insert into public.profiles (id, org_id, role, name)
   values ('<the-auth-user-id>', '00000000-0000-0000-0000-000000000001', 'admin', 'Your Name');
   ```

7. Sign in at `/login` with that email and password.

## Employee OTP (SMS)

Requires Twilio. In Supabase Dashboard → Authentication → Phone:
- Enable phone provider
- Add Twilio Account SID, Auth Token, Message Service SID
- SMS template: `Your Team Tracker code is {{ .Code }}`

Without Twilio, the Employee tab on the login page will error. Admin login (email/password) works without it.

## Environments

| File | When it's used | Committed? |
|---|---|---|
| `.env.local` | Local `pnpm dev` | Yes (POC only — see security note) |
| `.env.example` | Reference | Yes |
| Vercel env vars | Preview + production deploys | Set in Vercel dashboard |

## Vercel

The `alias0-0/teamtracker` repo is linked to https://teamtracker-nu.vercel.app.

Set these two env vars in Vercel → Settings → Environment Variables (scoped to Production, Preview, and Development):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Every push to `main` auto-deploys production. Every PR gets a preview URL.

## Scripts

```bash
pnpm dev         # local dev server
pnpm build       # production build
pnpm preview     # preview production build locally
pnpm typecheck   # strict TS check, no emit
pnpm lint        # eslint
```

## Structure

```
src/
  App.tsx              routes + auth guard
  main.tsx             providers (query, router, toaster)
  index.css            tailwind v4 + design tokens
  lib/
    supabase.ts        client
    auth.ts            useAuth hook (session + profile)
    cn.ts              className utility
  pages/
    login.tsx          admin (email/pw) + employee (OTP) tabs
    admin.tsx          admin dashboard shell
    employee.tsx       employee shift screen

supabase/
  migrations/
    001_schema.sql     tables, PostGIS, indexes
    002_rls.sql        row-level security policies (full access matrix)
    003_functions.sql  start_shift, end_shift, respond_dispatch, respond_sos, views
    004_audit.sql      audit triggers, immutability
    005_simulator.sql  pg_cron location simulator + 30-day retention + rate limiter
  seed.sql             org, depts, areas (profiles left for you to link to auth users)

.github/workflows/
  ci.yml               typecheck + build on every push/PR
```

## Security note

`.env.local` contains the Supabase **anon key**, which is designed to be public — it's protected by Row-Level Security policies (see `supabase/migrations/002_rls.sql`). Safe to commit for a POC. Do NOT ever commit the **service_role** key.

## Next steps

- [ ] Wire the admin dashboard to `active_employees_view` (Realtime)
- [ ] Add Leaflet map with employee pins
- [ ] Employee inbox for dispatches
- [ ] SOS composer + response tracker
- [ ] i18n (EN + AR with RTL)
- [ ] Playwright e2e tests
