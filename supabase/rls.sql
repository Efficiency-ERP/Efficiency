-- Row Level Security Policies
-- Run this AFTER schema.sql

-- Enable RLS on all tables
alter table organizations enable row level security;
alter table contacts enable row level security;
alter table articles enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;
alter table consignment_lines enable row level security;
alter table deliveries enable row level security;
alter table delivery_lines enable row level security;
alter table orders enable row level security;
alter table order_lines enable row level security;
alter table issues enable row level security;
alter table issue_lines enable row level security;
alter table profiles enable row level security;
alter table logs enable row level security;
alter table user_organizations enable row level security;

-- ============================================
-- HELPER: Get user's organization IDs (multi-org)
-- ============================================

create or replace function public.user_organization_ids()
returns setof uuid as $$
  select organization_id from user_organizations where user_id = auth.uid()
$$ language sql security definer stable;

-- ============================================
-- USER ORGANIZATIONS (junction table)
-- ============================================

create policy "Users can view own org memberships"
  on user_organizations for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can manage own org memberships"
  on user_organizations for all
  to authenticated
  using (user_id = auth.uid());

-- ============================================
-- ORGANIZATIONS
-- ============================================

-- Users can only see orgs they belong to
create policy "Users can view own organizations"
  on organizations for select
  to authenticated
  using (
    id in (select public.user_organization_ids())
  );

-- Users can create organizations
create policy "Users can create organizations"
  on organizations for insert
  to authenticated
  with check (true);

-- Users can update their own organizations
create policy "Users can update own organizations"
  on organizations for update
  to authenticated
  using (
    id in (select public.user_organization_ids())
  );

-- ============================================
-- CONTACTS
-- ============================================

-- Users can view non-internal contacts OR contacts belonging to their orgs
create policy "Users can view contacts"
  on contacts for select
  to authenticated
  using (
    is_internal_org = false
    or internal_organization_id in (select public.user_organization_ids())
  );

-- Users can create contacts
create policy "Users can create contacts"
  on contacts for insert
  to authenticated
  with check (true);

-- Users can update contacts
create policy "Users can update contacts"
  on contacts for update
  to authenticated
  using (true);

-- ============================================
-- ARTICLES
-- ============================================

create policy "Users can view articles"
  on articles for select
  to authenticated
  using (
    organization_id in (select public.user_organization_ids())
  );

create policy "Users can create articles"
  on articles for insert
  to authenticated
  with check (true);

create policy "Users can update articles"
  on articles for update
  to authenticated
  using (true);

-- ============================================
-- INVOICES
-- ============================================

create policy "Users can view invoices"
  on invoices for select
  to authenticated
  using (
    organization_id in (select public.user_organization_ids())
  );

create policy "Users can create invoices"
  on invoices for insert
  to authenticated
  with check (true);

create policy "Users can update invoices"
  on invoices for update
  to authenticated
  using (true);

-- ============================================
-- INVOICE LINES
-- ============================================

create policy "Users can view invoice lines"
  on invoice_lines for select
  to authenticated
  using (true);

create policy "Users can manage invoice lines"
  on invoice_lines for all
  to authenticated
  using (true);

-- ============================================
-- CONSIGNMENT LINES
-- ============================================

create policy "Users can view consignment lines"
  on consignment_lines for select
  to authenticated
  using (true);

create policy "Users can manage consignment lines"
  on consignment_lines for all
  to authenticated
  using (true);

-- ============================================
-- DELIVERIES
-- ============================================

create policy "Users can view deliveries"
  on deliveries for select
  to authenticated
  using (
    organization_id in (select public.user_organization_ids())
  );

create policy "Users can create deliveries"
  on deliveries for insert
  to authenticated
  with check (true);

create policy "Users can update deliveries"
  on deliveries for update
  to authenticated
  using (true);

-- ============================================
-- DELIVERY LINES
-- ============================================

create policy "Users can view delivery lines"
  on delivery_lines for select
  to authenticated
  using (true);

create policy "Users can manage delivery lines"
  on delivery_lines for all
  to authenticated
  using (true);

-- ============================================
-- ORDERS
-- ============================================

create policy "Users can view orders"
  on orders for select
  to authenticated
  using (
    organization_id in (select public.user_organization_ids())
  );

create policy "Users can create orders"
  on orders for insert
  to authenticated
  with check (true);

create policy "Users can update orders"
  on orders for update
  to authenticated
  using (true);

-- ============================================
-- ORDER LINES
-- ============================================

create policy "Users can view order lines"
  on order_lines for select
  to authenticated
  using (true);

create policy "Users can manage order lines"
  on order_lines for all
  to authenticated
  using (true);

-- ============================================
-- ISSUES
-- ============================================

create policy "Users can view issues"
  on issues for select
  to authenticated
  using (
    organization_id in (select public.user_organization_ids())
  );

create policy "Users can create issues"
  on issues for insert
  to authenticated
  with check (true);

create policy "Users can update issues"
  on issues for update
  to authenticated
  using (true);

-- ============================================
-- ISSUE LINES
-- ============================================

create policy "Users can view issue lines"
  on issue_lines for select
  to authenticated
  using (true);

create policy "Users can manage issue lines"
  on issue_lines for all
  to authenticated
  using (true);

-- ============================================
-- PROFILES
-- ============================================

-- Users can read their own profile
create policy "Users can view own profile"
  on profiles for select
  to authenticated
  using (id = auth.uid());

-- Users can update their own profile
create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid());

-- ============================================
-- LOGS
-- ============================================

create policy "Users can view logs"
  on logs for select
  to authenticated
  using (
    organization_id in (select public.user_organization_ids())
  );

create policy "Users can create logs"
  on logs for insert
  to authenticated
  with check (true);
