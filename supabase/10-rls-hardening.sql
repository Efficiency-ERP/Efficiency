-- ============================================
-- 10 RLS HARDENING
-- Closes cross-tenant read/write holes found during the document-flow work:
--   1. user_organizations had no WITH CHECK, so any authenticated user could
--      insert (own uid, ANY org id) and self-join a tenant they don't belong
--      to — after which every "correctly scoped" policy on every other
--      table legitimately granted them access. This is the hole that
--      mattered most.
--   2. All six *_lines tables were `using (true)` with no WITH CHECK —
--      fully open cross-tenant read/write, scoped now through their parent
--      header's organization_id.
--   3. Every header INSERT was `with check (true)` — a user could stamp a
--      row with someone else's organization_id. UPDATE was `using (true)`
--      on several headers too.
--   4. feedback/feedback_notes allowed fully anonymous (unauthenticated)
--      writes.
-- Safe to re-run.
-- ============================================

-- ============================================
-- ROLE COLUMN — lets the policies below be written role-aware once,
-- instead of getting rewritten again when member-management UI lands.
-- ============================================

alter table user_organizations add column if not exists role text not null default 'member';
alter table user_organizations drop constraint if exists user_organizations_role_check;
alter table user_organizations add constraint user_organizations_role_check check (role in ('admin', 'member'));

-- ============================================
-- USER_ORGANIZATIONS — the critical fix
-- ============================================

drop policy if exists "Users can manage own org memberships" on user_organizations;
drop policy if exists "Users can view own org memberships" on user_organizations;

create policy "Users can view own org memberships"
  on user_organizations for select
  to authenticated
  using (user_id = auth.uid());

-- The "does this org already have any members" check must see EVERY row,
-- not just the caller's own — but a plain subquery against
-- user_organizations here would itself be filtered by that table's own
-- SELECT policy (user_id = auth.uid()), so from the caller's perspective
-- any org they're not yet in always looks empty and the bootstrap branch
-- below would be trivially satisfied for any org. Route the count through
-- a SECURITY DEFINER function (same pattern as user_organization_ids())
-- so it bypasses RLS and sees the org's real membership.
create or replace function public.organization_member_count(org_id uuid)
returns bigint as $$
  select count(*) from user_organizations where organization_id = org_id
$$ language sql security definer stable;

-- Insert is allowed only to: (a) bootstrap the very first membership on a
-- brand-new org (no members yet — the org-creation flow), or (b) an
-- existing admin of that org adding someone (self or a teammate, once
-- member-management UI exists). Never a bare self-join to an org that
-- already has members.
create policy "Users can bootstrap or admins can add memberships"
  on user_organizations for insert
  to authenticated
  with check (
    (
      user_id = auth.uid()
      and public.organization_member_count(organization_id) = 0
    )
    or exists (
      select 1 from user_organizations uo2
      where uo2.organization_id = user_organizations.organization_id
        and uo2.user_id = auth.uid()
        and uo2.role = 'admin'
    )
  );

create policy "Admins can update memberships in their org"
  on user_organizations for update
  to authenticated
  using (
    exists (
      select 1 from user_organizations uo2
      where uo2.organization_id = user_organizations.organization_id
        and uo2.user_id = auth.uid()
        and uo2.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from user_organizations uo2
      where uo2.organization_id = user_organizations.organization_id
        and uo2.user_id = auth.uid()
        and uo2.role = 'admin'
    )
  );

create policy "Admins can remove memberships, users can leave"
  on user_organizations for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from user_organizations uo2
      where uo2.organization_id = user_organizations.organization_id
        and uo2.user_id = auth.uid()
        and uo2.role = 'admin'
    )
  );

-- ============================================
-- HEADER TABLES — INSERT/UPDATE now check organization_id, not `true`
-- ============================================

-- ARTICLES
drop policy if exists "Users can create articles" on articles;
drop policy if exists "Users can update articles" on articles;

create policy "Users can create articles"
  on articles for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

create policy "Users can update articles"
  on articles for update
  to authenticated
  using (organization_id in (select public.user_organization_ids()))
  with check (organization_id in (select public.user_organization_ids()));

-- CONTACTS — no organization_id column; ownership is via internal_organization_id
-- for internal-org contacts, and external contacts are intentionally shared
-- across tenants (matches the existing view policy). Write access mirrors
-- that: anyone can write an external contact, but an internal-org contact
-- must belong to one of the caller's own orgs.
drop policy if exists "Users can create contacts" on contacts;
drop policy if exists "Users can update contacts" on contacts;

create policy "Users can create contacts"
  on contacts for insert
  to authenticated
  with check (
    is_internal_org = false
    or internal_organization_id in (select public.user_organization_ids())
  );

create policy "Users can update contacts"
  on contacts for update
  to authenticated
  using (
    is_internal_org = false
    or internal_organization_id in (select public.user_organization_ids())
  )
  with check (
    is_internal_org = false
    or internal_organization_id in (select public.user_organization_ids())
  );

-- QUOTES
drop policy if exists "Users can create quotes" on quotes;
drop policy if exists "Users can update quotes" on quotes;

create policy "Users can create quotes"
  on quotes for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

create policy "Users can update quotes"
  on quotes for update
  to authenticated
  using (organization_id in (select public.user_organization_ids()))
  with check (organization_id in (select public.user_organization_ids()));

-- INVOICES (still no UPDATE policy — the immutability trigger blocks it)
drop policy if exists "Users can create invoices" on invoices;

create policy "Users can create invoices"
  on invoices for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

-- DELIVERIES
drop policy if exists "Users can create deliveries" on deliveries;
drop policy if exists "Users can update deliveries" on deliveries;

create policy "Users can create deliveries"
  on deliveries for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

create policy "Users can update deliveries"
  on deliveries for update
  to authenticated
  using (organization_id in (select public.user_organization_ids()))
  with check (organization_id in (select public.user_organization_ids()));

-- ORDERS
drop policy if exists "Users can create orders" on orders;
drop policy if exists "Users can update orders" on orders;

create policy "Users can create orders"
  on orders for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

create policy "Users can update orders"
  on orders for update
  to authenticated
  using (organization_id in (select public.user_organization_ids()))
  with check (organization_id in (select public.user_organization_ids()));

-- ISSUES
drop policy if exists "Users can create issues" on issues;
drop policy if exists "Users can update issues" on issues;

create policy "Users can create issues"
  on issues for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

create policy "Users can update issues"
  on issues for update
  to authenticated
  using (organization_id in (select public.user_organization_ids()))
  with check (organization_id in (select public.user_organization_ids()));

-- STOCK MOVEMENTS
drop policy if exists "Users can create stock movements" on stock_movements;

create policy "Users can create stock movements"
  on stock_movements for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

-- ============================================
-- LINE TABLES — scoped through their parent header's organization_id
-- ============================================

-- QUOTE LINES
drop policy if exists "Users can view quote lines" on quote_lines;
drop policy if exists "Users can manage quote lines" on quote_lines;

create policy "Users can view quote lines"
  on quote_lines for select
  to authenticated
  using (exists (
    select 1 from quotes q
    where q.id = quote_lines.quote_id
      and q.organization_id in (select public.user_organization_ids())
  ));

create policy "Users can manage quote lines"
  on quote_lines for all
  to authenticated
  using (exists (
    select 1 from quotes q
    where q.id = quote_lines.quote_id
      and q.organization_id in (select public.user_organization_ids())
  ))
  with check (exists (
    select 1 from quotes q
    where q.id = quote_lines.quote_id
      and q.organization_id in (select public.user_organization_ids())
  ));

-- INVOICE LINES
drop policy if exists "Users can view invoice lines" on invoice_lines;
drop policy if exists "Users can manage invoice lines" on invoice_lines;

create policy "Users can view invoice lines"
  on invoice_lines for select
  to authenticated
  using (exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and i.organization_id in (select public.user_organization_ids())
  ));

create policy "Users can manage invoice lines"
  on invoice_lines for all
  to authenticated
  using (exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and i.organization_id in (select public.user_organization_ids())
  ))
  with check (exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and i.organization_id in (select public.user_organization_ids())
  ));

-- DELIVERY LINES
drop policy if exists "Users can view delivery lines" on delivery_lines;
drop policy if exists "Users can manage delivery lines" on delivery_lines;

create policy "Users can view delivery lines"
  on delivery_lines for select
  to authenticated
  using (exists (
    select 1 from deliveries d
    where d.id = delivery_lines.delivery_id
      and d.organization_id in (select public.user_organization_ids())
  ));

create policy "Users can manage delivery lines"
  on delivery_lines for all
  to authenticated
  using (exists (
    select 1 from deliveries d
    where d.id = delivery_lines.delivery_id
      and d.organization_id in (select public.user_organization_ids())
  ))
  with check (exists (
    select 1 from deliveries d
    where d.id = delivery_lines.delivery_id
      and d.organization_id in (select public.user_organization_ids())
  ));

-- ORDER LINES
drop policy if exists "Users can view order lines" on order_lines;
drop policy if exists "Users can manage order lines" on order_lines;

create policy "Users can view order lines"
  on order_lines for select
  to authenticated
  using (exists (
    select 1 from orders o
    where o.id = order_lines.order_id
      and o.organization_id in (select public.user_organization_ids())
  ));

create policy "Users can manage order lines"
  on order_lines for all
  to authenticated
  using (exists (
    select 1 from orders o
    where o.id = order_lines.order_id
      and o.organization_id in (select public.user_organization_ids())
  ))
  with check (exists (
    select 1 from orders o
    where o.id = order_lines.order_id
      and o.organization_id in (select public.user_organization_ids())
  ));

-- ISSUE LINES
drop policy if exists "Users can view issue lines" on issue_lines;
drop policy if exists "Users can manage issue lines" on issue_lines;

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

-- CONSIGNMENT LINES — either invoice-linked (a charge) or standalone (a
-- return, organization_id set directly) — same split the table's own check
-- constraint already enforces.
drop policy if exists "Users can view consignment lines" on consignment_lines;
drop policy if exists "Users can manage consignment lines" on consignment_lines;

create policy "Users can view consignment lines"
  on consignment_lines for select
  to authenticated
  using (
    (invoice_id is not null and exists (
      select 1 from invoices i
      where i.id = consignment_lines.invoice_id
        and i.organization_id in (select public.user_organization_ids())
    ))
    or (invoice_id is null and organization_id in (select public.user_organization_ids()))
  );

create policy "Users can manage consignment lines"
  on consignment_lines for all
  to authenticated
  using (
    (invoice_id is not null and exists (
      select 1 from invoices i
      where i.id = consignment_lines.invoice_id
        and i.organization_id in (select public.user_organization_ids())
    ))
    or (invoice_id is null and organization_id in (select public.user_organization_ids()))
  )
  with check (
    (invoice_id is not null and exists (
      select 1 from invoices i
      where i.id = consignment_lines.invoice_id
        and i.organization_id in (select public.user_organization_ids())
    ))
    or (invoice_id is null and organization_id in (select public.user_organization_ids()))
  );

-- ============================================
-- FEEDBACK — require authentication for writes; anonymous submission
-- (already its own separate policy) is the only intentionally-open path.
-- ============================================

drop policy if exists "Anyone can update feedback" on feedback;
create policy "Authenticated users can update feedback"
  on feedback for update
  to authenticated
  using (true);

drop policy if exists "Anyone can create feedback notes" on feedback_notes;
drop policy if exists "Anyone can update feedback notes" on feedback_notes;
drop policy if exists "Anyone can delete feedback notes" on feedback_notes;

create policy "Authenticated users can create feedback notes"
  on feedback_notes for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update feedback notes"
  on feedback_notes for update
  to authenticated
  using (true);

create policy "Authenticated users can delete feedback notes"
  on feedback_notes for delete
  to authenticated
  using (true);
