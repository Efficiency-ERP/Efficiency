-- ============================================
-- 12 TENANTS
-- Introduces an explicit tenant layer above organizations. A tenant can
-- own multiple organizations; membership (user_tenants) lives at the
-- tenant level, so joining a tenant grants access to every org under it
-- automatically — including ones added later, with no per-org membership
-- row needed. Replaces user_organizations entirely.
--
-- Every other RLS policy in the app (articles, quotes, invoices,
-- deliveries, orders, issues, stock_movements, contacts, logs, all
-- *_lines tables, and organizations' own SELECT/UPDATE) only ever calls
-- public.user_organization_ids() — never user_organizations directly — so
-- redefining that one function to resolve through tenants is enough to
-- move the whole app onto the new model with no other policy changes.
-- ============================================

create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

alter table organizations add column if not exists tenant_id uuid references tenants(id);

create table if not exists user_tenants (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  primary key (user_id, tenant_id)
);

alter table tenants enable row level security;
alter table user_tenants enable row level security;

-- ============================================
-- BACKFILL — any organization that doesn't already have a tenant (i.e.
-- pre-existing production orgs; 11-test-tenants.sql assigns its own demo
-- orgs a tenant directly, so this skips them whichever order the two
-- files run in) gets a 1:1 tenant (tenant.id = org.id, a convenient key
-- reuse for exactly this backfill), preserving today's access exactly
-- without assuming which orgs count as "the same tenant" in reality —
-- that's a call for later, made by hand if needed.
-- ============================================

insert into tenants (id, name)
select o.id, o.name from organizations o where o.tenant_id is null
on conflict (id) do nothing;

update organizations set tenant_id = id where tenant_id is null;

insert into user_tenants (user_id, tenant_id, role)
select uo.user_id, uo.organization_id, uo.role
from user_organizations uo
on conflict (user_id, tenant_id) do nothing;

alter table organizations alter column tenant_id set not null;

-- ============================================
-- HELPER — redefine to resolve through tenant membership. Every other
-- policy that calls this function needs no change.
-- ============================================

create or replace function public.user_organization_ids()
returns setof uuid as $$
  select o.id from organizations o
  where o.tenant_id in (select tenant_id from user_tenants where user_id = auth.uid())
$$ language sql security definer stable;

-- Same self-blinding trap as organization_member_count had: without
-- SECURITY DEFINER, this subquery would be filtered by user_tenants' own
-- SELECT policy, and every tenant would look empty to an outsider.
create or replace function public.tenant_member_count(t_id uuid)
returns bigint as $$
  select count(*) from user_tenants where tenant_id = t_id
$$ language sql security definer stable;

-- ============================================
-- DROP user_organizations entirely (superseded by tenants/user_tenants)
-- ============================================

drop policy if exists "Users can view own org memberships" on user_organizations;
drop policy if exists "Users can bootstrap or admins can add memberships" on user_organizations;
drop policy if exists "Admins can update memberships in their org" on user_organizations;
drop policy if exists "Admins can remove memberships, users can leave" on user_organizations;
drop table if exists user_organizations;
drop function if exists public.organization_member_count(uuid);

-- ============================================
-- TENANTS / USER_TENANTS POLICIES — same shape as the user_organizations
-- policies from Stage 0, just renamed.
-- ============================================

create policy "Users can view own tenant memberships"
  on user_tenants for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can bootstrap or admins can add tenant memberships"
  on user_tenants for insert
  to authenticated
  with check (
    (user_id = auth.uid() and public.tenant_member_count(tenant_id) = 0)
    or exists (
      select 1 from user_tenants ut2
      where ut2.tenant_id = user_tenants.tenant_id
        and ut2.user_id = auth.uid()
        and ut2.role = 'admin'
    )
  );

create policy "Admins can update tenant memberships"
  on user_tenants for update
  to authenticated
  using (exists (
    select 1 from user_tenants ut2
    where ut2.tenant_id = user_tenants.tenant_id
      and ut2.user_id = auth.uid()
      and ut2.role = 'admin'
  ))
  with check (exists (
    select 1 from user_tenants ut2
    where ut2.tenant_id = user_tenants.tenant_id
      and ut2.user_id = auth.uid()
      and ut2.role = 'admin'
  ));

create policy "Admins can remove tenant memberships, users can leave"
  on user_tenants for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from user_tenants ut2
      where ut2.tenant_id = user_tenants.tenant_id
        and ut2.user_id = auth.uid()
        and ut2.role = 'admin'
    )
  );

create policy "Users can view own tenants"
  on tenants for select
  to authenticated
  using (id in (select tenant_id from user_tenants where user_id = auth.uid()));

-- Anyone authenticated can create a new tenant — the "stand up a new
-- company" entry point. createOrganization() immediately follows it with
-- the creator's own admin membership, then the org itself (see
-- src/lib/supabase/contacts.ts), so creating a tenant grants no access to
-- any other tenant's data.
create policy "Users can create tenants"
  on tenants for insert
  to authenticated
  with check (true);

create policy "Tenant members can update their tenant"
  on tenants for update
  to authenticated
  using (id in (select tenant_id from user_tenants where user_id = auth.uid()))
  with check (id in (select tenant_id from user_tenants where user_id = auth.uid()));

-- ============================================
-- ORGANIZATIONS — INSERT now requires an existing tenant membership
-- (createOrganization() creates the tenant + membership first, so by the
-- time it inserts the org the caller already qualifies). SELECT/UPDATE
-- policies are untouched — they already route through
-- user_organization_ids(), which now resolves via tenant.
-- ============================================

drop policy if exists "Users can create organizations" on organizations;
create policy "Users can create organizations"
  on organizations for insert
  to authenticated
  with check (tenant_id in (select tenant_id from user_tenants where user_id = auth.uid()));
