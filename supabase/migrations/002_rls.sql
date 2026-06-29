-- M4 Club Tracker — Row Level Security
-- V1: Single director, no enforced RLS (architecture-ready for V2 coach logins)
-- V2 hook: teamMatches() helper + coach_id on auth.users will wire in here.

-- Enable RLS on every table (policies below grant full access to authenticated users)
alter table teams          enable row level security;
alter table players        enable row level security;
alter table documents      enable row level security;
alter table assessments    enable row level security;
alter table apparel        enable row level security;
alter table coaches        enable row level security;
alter table certifications enable row level security;
alter table lineups        enable row level security;

-- ─── V1 policies: authenticated users can do everything ──────────────────────
-- Replace these with role-scoped policies when V2 coach logins are added.

create policy "authenticated full access" on teams
  for all using (auth.role() = 'authenticated');

create policy "authenticated full access" on players
  for all using (auth.role() = 'authenticated');

create policy "authenticated full access" on documents
  for all using (auth.role() = 'authenticated');

create policy "authenticated full access" on assessments
  for all using (auth.role() = 'authenticated');

create policy "authenticated full access" on apparel
  for all using (auth.role() = 'authenticated');

create policy "authenticated full access" on coaches
  for all using (auth.role() = 'authenticated');

create policy "authenticated full access" on certifications
  for all using (auth.role() = 'authenticated');

create policy "authenticated full access" on lineups
  for all using (auth.role() = 'authenticated');

-- ─── Storage policies ────────────────────────────────────────────────────────
-- player-photos: public read, authenticated write
create policy "public read player photos"
  on storage.objects for select
  using (bucket_id = 'player-photos');

create policy "authenticated upload player photos"
  on storage.objects for insert
  with check (bucket_id = 'player-photos' and auth.role() = 'authenticated');

create policy "authenticated delete player photos"
  on storage.objects for delete
  using (bucket_id = 'player-photos' and auth.role() = 'authenticated');

-- player-documents: authenticated only
create policy "authenticated access player documents"
  on storage.objects for all
  using (bucket_id = 'player-documents' and auth.role() = 'authenticated');

-- ─── V2 hook (placeholder) ───────────────────────────────────────────────────
-- When coach logins are added, replace the "authenticated full access" policies
-- with targeted policies using a helper like:
--
-- create or replace function teamMatches(team_id uuid)
-- returns boolean language sql security definer as $$
--   select team_id = any(
--     select unnest(teams) from coaches
--     where id = (select coach_id from auth.users where id = auth.uid())
--   )
-- $$;
--
-- Then scope players, lineups, assessments to: using (teamMatches(team_id))
