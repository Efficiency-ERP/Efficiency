-- ============================================
-- 02 ROW LEVEL SECURITY — Run after schema
-- Enables RLS + creates all access policies
-- Safe to re-run
--
-- Hardened version (folds in 10-rls-hardening.sql + 12-tenants.sql):
-- every INSERT/UPDATE checks organization_id against the caller's own orgs
-- instead of `true`, every *_lines table is scoped through its parent
-- header, and tenant membership (user_tenants) can no longer be
-- self-joined into a tenant that already has members.
--
-- Tenancy model: a tenant can own multiple organizations; joining a
-- tenant (user_tenants) grants access to every org under it, including
-- ones added later. Every policy below except tenants/user_tenants and
-- organizations' own INSERT routes through public.user_organization_ids()
-- — never user_tenants directly — so that's the one place tenancy is
-- actually resolved.
-- ============================================

-- Enable RLS on all tables (safe to re-run)
alter table if exists tenants enable row level security;
alter table if exists organizations enable row level security;
alter table if exists contacts enable row level security;
alter table if exists articles enable row level security;
alter table if exists documents enable row level security;
alter table if exists document_lines enable row level security;
alter table if exists consignment_lines enable row level security;
alter table if exists stock_movements enable row level security;
alter table if exists issues enable row level security;
alter table if exists issue_lines enable row level security;
alter table if exists profiles enable row level security;
alter table if exists logs enable row level security;
alter table if exists user_tenants enable row level security;
-- document_counters: no policies below on purpose — only the
-- security-definer next_document_number() function touches it.
alter table if exists document_counters enable row level security;

-- ============================================
-- HELPERS — SECURITY DEFINER so they bypass RLS on user_tenants itself;
-- without that, a query against user_tenants from inside a policy would
-- be filtered by that table's own SELECT policy, blinding it to every row
-- but the caller's own (see tenant_member_count below).
-- ============================================

-- Every org the caller can access, via tenant membership.
create or replace function public.user_organization_ids()
returns setof uuid as $$
  select o.id from organizations o
  where o.tenant_id in (select tenant_id from user_tenants where user_id = auth.uid())
$$ language sql security definer stable;

-- Used by the user_tenants INSERT policy to check whether a tenant already
-- has any members at all (the "am I the first admin" bootstrap case).
-- Must be SECURITY DEFINER: a plain subquery here would be filtered by
-- "Users can view own tenant memberships" (user_id = auth.uid()), so from
-- an outsider's perspective every tenant they're not in yet would
-- incorrectly look empty, and the bootstrap branch would be satisfiable
-- for any tenant.
create or replace function public.tenant_member_count(t_id uuid)
returns bigint as $$
  select count(*) from user_tenants where tenant_id = t_id
$$ language sql security definer stable;

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

-- tenants / user_tenants
drop policy if exists "Users can view own tenants" on tenants;
drop policy if exists "Users can create tenants" on tenants;
drop policy if exists "Tenant members can update their tenant" on tenants;
drop policy if exists "Users can view own tenant memberships" on user_tenants;
drop policy if exists "Users can bootstrap or admins can add tenant memberships" on user_tenants;
drop policy if exists "Admins can update tenant memberships" on user_tenants;
drop policy if exists "Admins can remove tenant memberships, users can leave" on user_tenants;

-- organizations
drop policy if exists "Users can view own organizations" on organizations;
drop policy if exists "Users can create organizations" on organizations;
drop policy if exists "Users can update own organizations" on organizations;

-- contacts
drop policy if exists "Users can view contacts" on contacts;
drop policy if exists "Users can create contacts" on contacts;
drop policy if exists "Users can update contacts" on contacts;

-- articles
drop policy if exists "Users can view articles" on articles;
drop policy if exists "Users can create articles" on articles;
drop policy if exists "Users can update articles" on articles;

-- documents
drop policy if exists "Users can view documents" on documents;
drop policy if exists "Users can create documents" on documents;
drop policy if exists "Users can update documents" on documents;

-- document_lines
drop policy if exists "Users can manage document lines" on document_lines;

-- consignment_lines
drop policy if exists "Users can view consignment lines" on consignment_lines;
drop policy if exists "Users can manage consignment lines" on consignment_lines;

-- stock_movements
drop policy if exists "Users can view stock movements" on stock_movements;
drop policy if exists "Users can create stock movements" on stock_movements;

-- issues
drop policy if exists "Users can view issues" on issues;
drop policy if exists "Users can create issues" on issues;
drop policy if exists "Users can update issues" on issues;

-- issue_lines
drop policy if exists "Users can view issue lines" on issue_lines;
drop policy if exists "Users can manage issue lines" on issue_lines;

-- profiles
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;

-- logs
drop policy if exists "Users can view logs" on logs;
drop policy if exists "Users can create logs" on logs;

-- ============================================
-- RECREATE ALL POLICIES
-- ============================================

-- USER TENANTS
create policy "Users can view own tenant memberships"
  on user_tenants for select
  to authenticated
  using (user_id = auth.uid());

-- Insert is allowed only to: (a) bootstrap the very first membership on a
-- brand-new tenant (no members yet — the "stand up a new company" flow),
-- or (b) an existing admin of that tenant adding someone (self or a
-- teammate, once member-management UI exists). Never a bare self-join to
-- a tenant that already has members.
create policy "Users can bootstrap or admins can add tenant memberships"
  on user_tenants for insert
  to authenticated
  with check (
    (
      user_id = auth.uid()
      and public.tenant_member_count(tenant_id) = 0
    )
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
  using (
    exists (
      select 1 from user_tenants ut2
      where ut2.tenant_id = user_tenants.tenant_id
        and ut2.user_id = auth.uid()
        and ut2.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from user_tenants ut2
      where ut2.tenant_id = user_tenants.tenant_id
        and ut2.user_id = auth.uid()
        and ut2.role = 'admin'
    )
  );

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

-- TENANTS
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

-- ORGANIZATIONS
create policy "Users can view own organizations"
  on organizations for select
  to authenticated
  using (id in (select public.user_organization_ids()));

-- Creating an org requires an existing membership in its tenant.
-- createOrganization() creates the tenant + membership first, so by the
-- time it inserts the org the caller already qualifies.
create policy "Users can create organizations"
  on organizations for insert
  to authenticated
  with check (tenant_id in (select tenant_id from user_tenants where user_id = auth.uid()));

create policy "Users can update own organizations"
  on organizations for update
  to authenticated
  using (id in (select public.user_organization_ids()))
  with check (id in (select public.user_organization_ids()));

-- CONTACTS — scoped by tenant_id, shared across every org under that
-- tenant (siblings under the same PME group see the same contact book) but
-- never across unrelated tenants. is_internal_org is derived, not a
-- trusted flag; contacts_internal_org_tenant_check() (01-schema.sql)
-- guarantees internal_organization_id always points within the same tenant.
create policy "Users can view contacts"
  on contacts for select
  to authenticated
  using (tenant_id in (select tenant_id from user_tenants where user_id = auth.uid()));

create policy "Users can create contacts"
  on contacts for insert
  to authenticated
  with check (tenant_id in (select tenant_id from user_tenants where user_id = auth.uid()));

create policy "Users can update contacts"
  on contacts for update
  to authenticated
  using (tenant_id in (select tenant_id from user_tenants where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from user_tenants where user_id = auth.uid()));

-- ARTICLES
create policy "Users can view articles"
  on articles for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create articles"
  on articles for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

create policy "Users can update articles"
  on articles for update
  to authenticated
  using (organization_id in (select public.user_organization_ids()))
  with check (organization_id in (select public.user_organization_ids()));

-- DOCUMENTS (quote/invoice/delivery/order, merged)
create policy "Users can view documents"
  on documents for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create documents"
  on documents for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

-- Invoices get no path to UPDATE here (matching invoices' old "no update
-- policy" stance) — the immutability trigger is the second, belt-and-
-- suspenders layer for the same rule. Quote/delivery/order rows stay
-- updatable.
create policy "Users can update documents"
  on documents for update
  to authenticated
  using (organization_id in (select public.user_organization_ids()) and kind <> 'invoice')
  with check (organization_id in (select public.user_organization_ids()) and kind <> 'invoice');

-- DOCUMENT LINES
create policy "Users can manage document lines"
  on document_lines for all
  to authenticated
  using (exists (
    select 1 from documents d
    where d.id = document_lines.document_id
      and d.organization_id in (select public.user_organization_ids())
  ))
  with check (exists (
    select 1 from documents d
    where d.id = document_lines.document_id
      and d.organization_id in (select public.user_organization_ids())
  ));

-- CONSIGNMENT LINES — either document-linked (a charge, always kind=invoice)
-- or standalone (a return, organization_id set directly) — same split the
-- table's own check constraint already enforces.
create policy "Users can view consignment lines"
  on consignment_lines for select
  to authenticated
  using (
    (document_id is not null and exists (
      select 1 from documents d
      where d.id = consignment_lines.document_id
        and d.organization_id in (select public.user_organization_ids())
    ))
    or (document_id is null and organization_id in (select public.user_organization_ids()))
  );

create policy "Users can manage consignment lines"
  on consignment_lines for all
  to authenticated
  using (
    (document_id is not null and exists (
      select 1 from documents d
      where d.id = consignment_lines.document_id
        and d.organization_id in (select public.user_organization_ids())
    ))
    or (document_id is null and organization_id in (select public.user_organization_ids()))
  )
  with check (
    (document_id is not null and exists (
      select 1 from documents d
      where d.id = consignment_lines.document_id
        and d.organization_id in (select public.user_organization_ids())
    ))
    or (document_id is null and organization_id in (select public.user_organization_ids()))
  );

-- STOCK MOVEMENTS
create policy "Users can view stock movements"
  on stock_movements for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create stock movements"
  on stock_movements for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

-- ISSUES
create policy "Users can view issues"
  on issues for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create issues"
  on issues for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

create policy "Users can update issues"
  on issues for update
  to authenticated
  using (organization_id in (select public.user_organization_ids()))
  with check (organization_id in (select public.user_organization_ids()));

-- ISSUE LINES
create policy "Users can view issue lines"
  on issue_lines for select
  to authenticated
  using (exists (
    select 1 from issues i
    where i.id = issue_lines.issue_id
      and i.organization_id in (select public.user_organization_ids())
  ));

create policy "Users can manage issue lines"
  on issue_lines for all
  to authenticated
  using (exists (
    select 1 from issues i
    where i.id = issue_lines.issue_id
      and i.organization_id in (select public.user_organization_ids())
  ))
  with check (exists (
    select 1 from issues i
    where i.id = issue_lines.issue_id
      and i.organization_id in (select public.user_organization_ids())
  ));

-- PROFILES
create policy "Users can view own profile"
  on profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid());

-- LOGS
-- organization_id can be null for actions with no single owning PME (contacts,
-- PME creation, profile/settings changes) — those rows are global activity
-- and must stay visible, not just ones scoped to the caller's PMEs.
create policy "Users can view logs"
  on logs for select
  to authenticated
  using (organization_id is null or organization_id in (select public.user_organization_ids()));

create policy "Users can create logs"
  on logs for insert
  to authenticated
  with check (true);
