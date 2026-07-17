-- ============================================
-- 02 ROW LEVEL SECURITY — Run after schema
-- Enables RLS + creates all access policies
-- Safe to re-run
-- ============================================

-- Enable RLS on all tables (safe to re-run)
alter table if exists organizations enable row level security;
alter table if exists contacts enable row level security;
alter table if exists articles enable row level security;
alter table if exists invoices enable row level security;
alter table if exists invoice_lines enable row level security;
alter table if exists consignment_lines enable row level security;
alter table if exists deliveries enable row level security;
alter table if exists delivery_lines enable row level security;
alter table if exists stock_movements enable row level security;
alter table if exists orders enable row level security;
alter table if exists order_lines enable row level security;
alter table if exists issues enable row level security;
alter table if exists issue_lines enable row level security;
alter table if exists profiles enable row level security;
alter table if exists logs enable row level security;
alter table if exists user_organizations enable row level security;

-- ============================================
-- HELPER: Get user's organization IDs (multi-org)
-- ============================================

create or replace function public.user_organization_ids()
returns setof uuid as $$
  select organization_id from user_organizations where user_id = auth.uid()
$$ language sql security definer stable;

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

-- user_organizations
drop policy if exists "Users can view own org memberships" on user_organizations;
drop policy if exists "Users can manage own org memberships" on user_organizations;

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

-- invoices
drop policy if exists "Users can view invoices" on invoices;
drop policy if exists "Users can create invoices" on invoices;
drop policy if exists "Users can update invoices" on invoices;

-- invoice_lines
drop policy if exists "Users can view invoice lines" on invoice_lines;
drop policy if exists "Users can manage invoice lines" on invoice_lines;

-- consignment_lines
drop policy if exists "Users can view consignment lines" on consignment_lines;
drop policy if exists "Users can manage consignment lines" on consignment_lines;

-- deliveries
drop policy if exists "Users can view deliveries" on deliveries;
drop policy if exists "Users can create deliveries" on deliveries;
drop policy if exists "Users can update deliveries" on deliveries;

-- delivery_lines
drop policy if exists "Users can view delivery lines" on delivery_lines;
drop policy if exists "Users can manage delivery lines" on delivery_lines;

-- stock_movements
drop policy if exists "Users can view stock movements" on stock_movements;
drop policy if exists "Users can create stock movements" on stock_movements;

-- orders
drop policy if exists "Users can view orders" on orders;
drop policy if exists "Users can create orders" on orders;
drop policy if exists "Users can update orders" on orders;

-- order_lines
drop policy if exists "Users can view order lines" on order_lines;
drop policy if exists "Users can manage order lines" on order_lines;

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

-- USER ORGANIZATIONS
create policy "Users can view own org memberships"
  on user_organizations for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can manage own org memberships"
  on user_organizations for all
  to authenticated
  using (user_id = auth.uid());

-- ORGANIZATIONS
create policy "Users can view own organizations"
  on organizations for select
  to authenticated
  using (id in (select public.user_organization_ids()));

create policy "Users can create organizations"
  on organizations for insert
  to authenticated
  with check (true);

create policy "Users can update own organizations"
  on organizations for update
  to authenticated
  using (id in (select public.user_organization_ids()));

-- CONTACTS
create policy "Users can view contacts"
  on contacts for select
  to authenticated
  using (
    is_internal_org = false
    or internal_organization_id in (select public.user_organization_ids())
  );

create policy "Users can create contacts"
  on contacts for insert
  to authenticated
  with check (true);

create policy "Users can update contacts"
  on contacts for update
  to authenticated
  using (true);

-- ARTICLES
create policy "Users can view articles"
  on articles for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create articles"
  on articles for insert
  to authenticated
  with check (true);

create policy "Users can update articles"
  on articles for update
  to authenticated
  using (true);

-- INVOICES
create policy "Users can view invoices"
  on invoices for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create invoices"
  on invoices for insert
  to authenticated
  with check (true);

create policy "Users can update invoices"
  on invoices for update
  to authenticated
  using (true);

-- INVOICE LINES
create policy "Users can view invoice lines"
  on invoice_lines for select
  to authenticated
  using (true);

create policy "Users can manage invoice lines"
  on invoice_lines for all
  to authenticated
  using (true);

-- CONSIGNMENT LINES
create policy "Users can view consignment lines"
  on consignment_lines for select
  to authenticated
  using (true);

create policy "Users can manage consignment lines"
  on consignment_lines for all
  to authenticated
  using (true);

-- DELIVERIES
create policy "Users can view deliveries"
  on deliveries for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create deliveries"
  on deliveries for insert
  to authenticated
  with check (true);

create policy "Users can update deliveries"
  on deliveries for update
  to authenticated
  using (true);

-- DELIVERY LINES
create policy "Users can view delivery lines"
  on delivery_lines for select
  to authenticated
  using (true);

create policy "Users can manage delivery lines"
  on delivery_lines for all
  to authenticated
  using (true);

-- STOCK MOVEMENTS
create policy "Users can view stock movements"
  on stock_movements for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create stock movements"
  on stock_movements for insert
  to authenticated
  with check (true);

-- ORDERS
create policy "Users can view orders"
  on orders for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create orders"
  on orders for insert
  to authenticated
  with check (true);

create policy "Users can update orders"
  on orders for update
  to authenticated
  using (true);

-- ORDER LINES
create policy "Users can view order lines"
  on order_lines for select
  to authenticated
  using (true);

create policy "Users can manage order lines"
  on order_lines for all
  to authenticated
  using (true);

-- ISSUES
create policy "Users can view issues"
  on issues for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create issues"
  on issues for insert
  to authenticated
  with check (true);

create policy "Users can update issues"
  on issues for update
  to authenticated
  using (true);

-- ISSUE LINES
create policy "Users can view issue lines"
  on issue_lines for select
  to authenticated
  using (true);

create policy "Users can manage issue lines"
  on issue_lines for all
  to authenticated
  using (true);

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
