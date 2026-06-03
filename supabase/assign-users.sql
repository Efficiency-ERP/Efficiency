-- Assign Users to Organizations
-- Run AFTER seed.sql and AFTER creating users via Supabase Auth
--
-- HOW TO USE:
-- 1. Create users in Supabase Dashboard > Authentication > Users (or via the app signup)
-- 2. Copy their User UUIDs from the Dashboard
-- 3. Replace the UUIDs below and run this SQL

-- ============================================
-- EXAMPLE: Assign adam@gmail.com to Org A only
-- ============================================
-- Replace the user_id with the actual UUID from auth.users

-- Find user by email and assign to Org A:
insert into user_organizations (user_id, organization_id)
select id, 'a1000000-0000-0000-0000-000000000001'
from auth.users where email = 'adam@gmail.com'
on conflict do nothing;

-- ============================================
-- EXAMPLE: Assign admin@gmail.com to ALL orgs
-- ============================================

insert into user_organizations (user_id, organization_id)
select id, unnest(ARRAY[
  'a1000000-0000-0000-0000-000000000001'::uuid,
  'a1000000-0000-0000-0000-000000000002'::uuid
])
from auth.users where email = 'admin@gmail.com'
on conflict do nothing;
