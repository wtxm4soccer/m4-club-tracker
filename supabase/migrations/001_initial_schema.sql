-- M4 Club Tracker — Initial Schema
-- Phase 1: All tables from Build Spec §5

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Helpers ─────────────────────────────────────────────────────────────────
-- Auto-update updated_at on any table that has it
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── 5.1 teams ───────────────────────────────────────────────────────────────
create table if not exists teams (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace trigger teams_updated_at
  before update on teams
  for each row execute function set_updated_at();

-- ─── 5.6 coaches ─────────────────────────────────────────────────────────────
-- Coaches before players so player FK can reference nothing yet (no FK to coaches)
create table if not exists coaches (
  id          uuid primary key default uuid_generate_v4(),
  first_name  text not null,
  last_name   text not null,
  role        text not null check (role in ('Head Coach','Assistant Coach','Club Director','Volunteer')),
  teams       text[] not null default '{}',   -- array of team UUIDs (loose reference for V1)
  email       text,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace trigger coaches_updated_at
  before update on coaches
  for each row execute function set_updated_at();

-- ─── 5.2 players ─────────────────────────────────────────────────────────────
create table if not exists players (
  id                uuid primary key default uuid_generate_v4(),
  team_id           uuid references teams(id) on delete set null,  -- nullable: unassigned
  first_name        text not null,
  last_name         text not null,
  number            text,
  dob               date,
  positions         text[] not null default '{}',
  status            text not null default 'Prospective'
                      check (status in ('Confirmed','Prospective','Offered','Not Selected','Declined','Archived')),
  parent_name       text,
  parent_phone      text,
  parent_email      text,
  emergency_contact text,
  emergency_phone   text,
  notes             text,
  photo_url         text,
  team_reach        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists players_team_id_idx on players(team_id);
create index if not exists players_status_idx  on players(status);

create or replace trigger players_updated_at
  before update on players
  for each row execute function set_updated_at();

-- ─── 5.3 documents ───────────────────────────────────────────────────────────
create table if not exists documents (
  id          uuid primary key default uuid_generate_v4(),
  player_id   uuid not null references players(id) on delete cascade,
  doc_type    text not null check (doc_type in (
                'Waiver','Medical Release','Family Code of Conduct',
                'Player Participation','Proof of Birth','Team Reach')),
  status      text not null default 'not_sent'
                check (status in ('not_sent','sent','signed')),
  date_sent   date,
  date_signed date,
  external_id text,  -- DocuSeal envelope ID
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(player_id, doc_type)
);

create index if not exists documents_player_id_idx on documents(player_id);

create or replace trigger documents_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- ─── 5.4 assessments ─────────────────────────────────────────────────────────
create table if not exists assessments (
  id        uuid primary key default uuid_generate_v4(),
  player_id uuid not null references players(id) on delete cascade,
  date      date not null default current_date,
  evaluator text,
  technical int  not null default 5 check (technical between 0 and 10),
  tactical  int  not null default 5 check (tactical  between 0 and 10),
  physical  int  not null default 5 check (physical  between 0 and 10),
  mental    int  not null default 5 check (mental    between 0 and 10),
  notes     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists assessments_player_id_idx on assessments(player_id);

create or replace trigger assessments_updated_at
  before update on assessments
  for each row execute function set_updated_at();

-- ─── 5.5 apparel ─────────────────────────────────────────────────────────────
create table if not exists apparel (
  id           uuid primary key default uuid_generate_v4(),
  entity_id    uuid not null,
  entity_type  text not null check (entity_type in ('player','coach')),
  item         text not null check (item in ('Shirt','Shorts','Pants','Jacket')),
  size         text,
  status       text not null default 'not_issued'
                 check (status in ('not_issued','issued')),
  date_issued  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(entity_id, entity_type, item)
);

create index if not exists apparel_entity_idx on apparel(entity_id, entity_type);

create or replace trigger apparel_updated_at
  before update on apparel
  for each row execute function set_updated_at();

-- ─── 5.7 certifications ──────────────────────────────────────────────────────
create table if not exists certifications (
  id             uuid primary key default uuid_generate_v4(),
  coach_id       uuid not null references coaches(id) on delete cascade,
  cert_type      text not null check (cert_type in (
                   'SafeSport','Background Check',
                   'US Soccer Grassroots License','CDC Concussion Training')),
  status         text not null default 'not_started'
                   check (status in ('not_started','in_progress','complete')),
  date_completed date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(coach_id, cert_type)
);

create index if not exists certifications_coach_id_idx on certifications(coach_id);

create or replace trigger certifications_updated_at
  before update on certifications
  for each row execute function set_updated_at();

-- ─── 5.8 lineups ─────────────────────────────────────────────────────────────
create table if not exists lineups (
  id             uuid primary key default uuid_generate_v4(),
  team_id        uuid not null references teams(id) on delete cascade,
  date           date not null default current_date,
  format         text not null check (format in ('5v5','7v7','9v9','11v11')),
  formation_name text not null,
  opponent       text,
  slots          jsonb not null default '[]',  -- [{code,label,x,y,player_id}]
  subs           uuid[] not null default '{}', -- ordered bench player IDs
  excluded       uuid[] not null default '{}', -- player IDs marked out
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists lineups_team_id_date_idx on lineups(team_id, date desc);

create or replace trigger lineups_updated_at
  before update on lineups
  for each row execute function set_updated_at();

-- ─── Storage buckets ─────────────────────────────────────────────────────────
-- Run in Supabase Dashboard → Storage if not using CLI:
--   Bucket: player-photos   (public: true)
--   Bucket: player-documents (public: false)

insert into storage.buckets (id, name, public)
values
  ('player-photos',    'player-photos',    true),
  ('player-documents', 'player-documents', false)
on conflict (id) do nothing;
