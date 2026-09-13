-- ============================================
-- 11 TEST TENANTS — Manual, run whenever needed
-- Creates generic demo logins across two demo tenants, shaped to exercise
-- both sides of the tenant model (12-tenants.sql):
--   - Demo Tenant One owns TWO organizations (Alpha, Beta) with TWO users
--     (demo1 admin, demo2 member) — one tenant, multiple orgs: they
--     should switch freely between Alpha and Beta, and see each other's
--     data in both.
--   - Demo Tenant Two owns ONE organization (Gamma) with ONE user (demo3)
--     — a separate tenant, to confirm it can NOT see Alpha/Beta and vice
--     versa.
-- Self-contained: does not depend on 12-tenants.sql having run first (or
-- vice versa) — run this and 12-tenants.sql in either order. None of these
-- are tied to any real person.
-- Safe to re-run (ON CONFLICT DO NOTHING).
--
-- Logins (all password Demo1234!):
--   demo1@efficiency.test  — admin,  Demo Tenant One (Alpha + Beta)
--   demo2@efficiency.test  — member, Demo Tenant One (Alpha + Beta)
--   demo3@efficiency.test  — admin,  Demo Tenant Two (Gamma, alone)
-- ============================================

insert into tenants (id, name) values
  ('c1000000-0000-0000-0000-000000000001', 'Demo Tenant One'),
  ('c1000000-0000-0000-0000-000000000002', 'Demo Tenant Two')
on conflict (id) do nothing;

insert into organizations (id, tenant_id, name, address, contact)
values
  ('a1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'Demo Company Alpha',
   '{"line1": "1 Rue Demo", "city": "Tunis", "zipCode": "1000", "country": "Tunisie"}'::jsonb,
   '{"phone": "", "fax": null}'::jsonb),
  ('a1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', 'Demo Company Beta',
   '{"line1": "2 Rue Demo", "city": "Sfax", "zipCode": "3000", "country": "Tunisie"}'::jsonb,
   '{"phone": "", "fax": null}'::jsonb),
  ('a1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000002', 'Demo Company Gamma',
   '{"line1": "3 Rue Demo", "city": "Sousse", "zipCode": "4000", "country": "Tunisie"}'::jsonb,
   '{"phone": "", "fax": null}'::jsonb)
on conflict (id) do nothing;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'demo1@efficiency.test',
   extensions.crypt('Demo1234!', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb,
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'demo2@efficiency.test',
   extensions.crypt('Demo1234!', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb,
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000003',
   'authenticated', 'authenticated', 'demo3@efficiency.test',
   extensions.crypt('Demo1234!', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb,
   '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   '{"sub":"b1000000-0000-0000-0000-000000000001","email":"demo1@efficiency.test","email_verified":false,"phone_verified":false}'::jsonb,
   'email', now(), now(), now()),
  (gen_random_uuid(), 'b1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002',
   '{"sub":"b1000000-0000-0000-0000-000000000002","email":"demo2@efficiency.test","email_verified":false,"phone_verified":false}'::jsonb,
   'email', now(), now(), now()),
  (gen_random_uuid(), 'b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003',
   '{"sub":"b1000000-0000-0000-0000-000000000003","email":"demo3@efficiency.test","email_verified":false,"phone_verified":false}'::jsonb,
   'email', now(), now(), now())
on conflict do nothing;

insert into user_tenants (user_id, tenant_id, role)
values
  ('b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'admin'),
  ('b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'member'),
  ('b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'admin')
on conflict (user_id, tenant_id) do update set role = excluded.role;
