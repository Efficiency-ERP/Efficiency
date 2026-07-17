-- ============================================
-- 05 ASSIGN USERS — Manual, run whenever needed
-- Links auth.users to organizations via user_organizations.
-- Not part of the sequential setup: run this after real users have
-- signed up (or after seeding), editing the emails below to match.
-- Safe to re-run (ON CONFLICT DO NOTHING)
-- ============================================
-- HOW TO USE:
-- 1. Create users in Supabase Dashboard > Authentication > Users
-- 2. Edit the emails below to match yours
-- 3. Run this script

-- Assign adam@gmail.com to Org A
insert into user_organizations (user_id, organization_id)
select id, 'a1000000-0000-0000-0000-000000000001'
from auth.users where email = 'adam@gmail.com'
on conflict do nothing;

-- Assign admin@gmail.com to ALL orgs
insert into user_organizations (user_id, organization_id)
select id, unnest(ARRAY[
  'a1000000-0000-0000-0000-000000000001'::uuid,
  'a1000000-0000-0000-0000-000000000002'::uuid
])
from auth.users where email = 'admin@gmail.com'
on conflict do nothing;
