# Team Tracker — Mobile (Employee app)

Expo / React Native. Run via Expo Go for Phase 1 — no store build required.

## Setup

```bash
npm install -g eas-cli   # optional, only needed later for standalone builds
npm install
cp .env.example .env.local   # already filled with dev Supabase creds
npx expo start
```

Scan the QR code with **Expo Go** on your Android phone (or press `a` for an Android emulator).

## Environment

Expo automatically loads `.env.local` and exposes any `EXPO_PUBLIC_*` variable to the app — no extra config. Two Supabase projects (dev/prod) are supported by swapping the values in `.env.local` before running `expo start`, since Expo Go doesn't do a build step per environment the way Vercel does.

## What's implemented (Phase 1)

- **Login** — email/password
- **Register** — name, email, password, mobile, dept, zone (dropdown from `zones` table)
- **Home/Shift** — large Start Shift / End Shift button, status text, last-location-sent time
- **Location tracking** — `expo-location` + `expo-task-manager`, foreground service, updates every 5 min or 50m moved, continues when backgrounded
- **SOS** — Realtime listener on `sos_broadcasts`; shows a full-width red banner + fires a local notification with sound, whether foregrounded or backgrounded
- **Profile** — read-only info + Log Out

## Notes

- Background location requires a **physical device** — simulators/emulators don't reliably report background location.
- On first shift start, Android/iOS will prompt for location permission twice (foreground, then background) — this is expected OS behavior, not a bug.
- No dark mode, no animations — single accent color (deep blue) per the Phase 1 visual spec.
