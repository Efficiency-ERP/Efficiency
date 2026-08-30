-- ============================================
-- 05 ASSIGN USERS — Manual, run whenever needed
-- Links auth.users to tenants via user_tenants. Joining a tenant grants
-- access to every organization under it.
-- Not part of the sequential setup: run this after real users have
-- signed up (or after seeding), editing the emails below to match.
-- Safe to re-run (ON CONFLICT DO NOTHING)
-- ============================================
-- HOW TO USE:
-- 1. Create users in Supabase Dashboard > Authentication > Users
-- 2. Edit the emails below to match yours
-- 3. Run this script
--
-- Note: for orgs backfilled by 12-tenants.sql before any real multi-org
-- tenant existed, tenant.id == organization.id (a convenience key reuse
-- for that 1:1 backfill), so the tenant ids below match the org ids from
-- earlier versions of this file.

-- Assign adam@gmail.com to Tenant A
insert into user_tenants (user_id, tenant_id, role)
select id, 'a1000000-0000-0000-0000-000000000001', 'admin'
from auth.users where email = 'adam@gmail.com'
on conflict do nothing;

-- Assign admin@gmail.com to ALL tenants
insert into user_tenants (user_id, tenant_id, role)
select id, unnest(ARRAY[
  'a1000000-0000-0000-0000-000000000001'::uuid,
  'a1000000-0000-0000-0000-000000000002'::uuid
]), 'admin'
from auth.users where email = 'admin@gmail.com'
on conflict do nothing;
