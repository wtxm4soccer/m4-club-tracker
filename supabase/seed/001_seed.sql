-- M4 Club Tracker — Seed Data
-- Sample U9 and U10 roster data for initial development.
-- Replace with real player data before going live.
-- Run AFTER migrations 001 and 002.

-- ─── Teams ───────────────────────────────────────────────────────────────────
insert into teams (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'U9 Boys'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'U10 Boys')
on conflict (id) do nothing;

-- ─── Coaches ─────────────────────────────────────────────────────────────────
insert into coaches (id, first_name, last_name, role, teams, email, phone) values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   'Levi', 'Harris', 'Club Director',
   array['aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002'],
   'wtxm4soccer@gmail.com', '')
on conflict (id) do nothing;

-- ─── Coach certifications ─────────────────────────────────────────────────────
insert into certifications (coach_id, cert_type, status) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'SafeSport',                    'not_started'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Background Check',             'not_started'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'US Soccer Grassroots License', 'not_started'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'CDC Concussion Training',      'not_started')
on conflict (coach_id, cert_type) do nothing;

-- ─── Sample U9 Players ───────────────────────────────────────────────────────
-- Add real player data below.  These are placeholder rows to validate the schema.
insert into players (id, team_id, first_name, last_name, number, dob, positions, status) values
  ('cccccccc-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Alex', 'Sample', '1', '2016-03-15', array['GK'], 'Confirmed'),
  ('cccccccc-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Jordan', 'Demo', '7', '2016-07-22', array['CM','AM'], 'Confirmed')
on conflict (id) do nothing;

-- ─── Sample U10 Players ──────────────────────────────────────────────────────
insert into players (id, team_id, first_name, last_name, number, dob, positions, status) values
  ('cccccccc-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000002',
   'Sam', 'Placeholder', '10', '2015-01-10', array['ST','CF'], 'Confirmed'),
  ('cccccccc-0000-0000-0000-000000000004',
   'aaaaaaaa-0000-0000-0000-000000000002',
   'Taylor', 'Example', '4', '2015-09-05', array['CB','FB'], 'Prospective')
on conflict (id) do nothing;

-- ─── Seed documents for each sample player ───────────────────────────────────
do $$
declare
  pid uuid;
  doc text;
begin
  foreach pid in array array[
    'cccccccc-0000-0000-0000-000000000001'::uuid,
    'cccccccc-0000-0000-0000-000000000002'::uuid,
    'cccccccc-0000-0000-0000-000000000003'::uuid,
    'cccccccc-0000-0000-0000-000000000004'::uuid
  ] loop
    foreach doc in array array[
      'Waiver','Medical Release','Family Code of Conduct',
      'Player Participation','Proof of Birth','Team Reach'
    ] loop
      insert into documents (player_id, doc_type, status)
      values (pid, doc, 'not_sent')
      on conflict (player_id, doc_type) do nothing;
    end loop;
  end loop;
end;
$$;

-- ─── Seed apparel for sample players ─────────────────────────────────────────
do $$
declare
  pid uuid;
  itm text;
begin
  foreach pid in array array[
    'cccccccc-0000-0000-0000-000000000001'::uuid,
    'cccccccc-0000-0000-0000-000000000002'::uuid,
    'cccccccc-0000-0000-0000-000000000003'::uuid,
    'cccccccc-0000-0000-0000-000000000004'::uuid
  ] loop
    foreach itm in array array['Shirt','Shorts','Pants','Jacket'] loop
      insert into apparel (entity_id, entity_type, item, status)
      values (pid, 'player', itm, 'not_issued')
      on conflict (entity_id, entity_type, item) do nothing;
    end loop;
  end loop;
end;
$$;
