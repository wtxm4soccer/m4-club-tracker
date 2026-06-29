# M4 Club Tracker — Supabase Setup

## Phase 1: New Project

1. Go to [supabase.com](https://supabase.com) → New project
   - Name: `m4-club-tracker`
   - Password: (save this — you'll need it)
   - Region: US East (closest to Midland, TX)

2. After the project spins up, go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never expose to client)

## Run Migrations

Go to **SQL Editor** in the Supabase dashboard and run each file in order:

1. `migrations/001_initial_schema.sql` — creates all tables + storage buckets
2. `migrations/002_rls.sql` — enables RLS with V1 open policies
3. `seed/001_seed.sql` — inserts placeholder roster data for dev testing

Or use the Supabase CLI (recommended for later phases):
```bash
npx supabase db push
```

## Create Auth User

Go to **Authentication → Users → Add user**:
- Email: `wtxm4soccer@gmail.com`
- Password: (choose a strong one)
- Auto-confirm email: yes

This is the V1 director account. All data is accessible once logged in.

## Storage Buckets

The migration script creates both buckets automatically:
- `player-photos` — public (headshots shown on cards)
- `player-documents` — private (Proof of Birth, etc.)

If the INSERT into `storage.buckets` fails (permissions issue), create them manually in **Storage → New bucket**.

## Environment Variables

Create `.env.local` at the Next.js project root:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Schema Overview

| Table | Purpose |
|---|---|
| `teams` | U9 Boys, U10 Boys, etc. |
| `players` | Full player profiles with status |
| `documents` | 6 doc types per player, DocuSeal integration |
| `assessments` | Four Corner Model snapshots |
| `apparel` | Shirt/Shorts/Pants/Jacket per player or coach |
| `coaches` | Staff with role + team assignments |
| `certifications` | SafeSport, Background Check, etc. per coach |
| `lineups` | Game card saves with slot assignments |

## V2 RLS Hook

When coach logins are added in V2, replace the open policies in `002_rls.sql`
with team-scoped policies using the `teamMatches()` helper (see comments in that file).
