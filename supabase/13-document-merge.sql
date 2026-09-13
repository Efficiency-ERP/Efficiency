-- ============================================
-- 13 DOCUMENT MERGE
-- Merges quote/invoice/delivery/order — the four steps that are all on the
-- way to money, all counterparty-driven, all linked via the same
-- backward-FK chain — into documents/document_lines. `issues` (goods-issue,
-- stock-only) is deliberately NOT merged in: the existing design principle
-- ("it must never gain a financial/invoice link") is preserved at the
-- schema level rather than by a constraint someone has to remember; it
-- just gains article_id here (today's real gap) in place.
--
-- Every existing row keeps its exact id (documents.id = quotes.id /
-- invoices.id / etc.) so every reference to it — URLs, the backward-FK
-- chain — keeps working with no data loss.
--
-- Scope note: this migration does NOT rename mf/unique_id/
-- conditions_de_vente/contact/units_per_article — those are cosmetic,
-- unrelated to the merge itself, and deferred to the later naming pass
-- (alongside PME -> Organization) so the same files aren't touched twice.
-- It DOES rename unit_price_puht -> unit_price_excl_tax, remise_percent ->
-- discount_percent, and totals.htSubtotal/ttc -> subtotal_excl_tax/
-- total_incl_tax, since those are intrinsic to the document_lines merge.
-- ============================================

-- ============================================
-- TABLES
-- ============================================

create table documents (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (kind in ('quote', 'invoice', 'delivery', 'order')),
  subtype text,
  number text not null,
  date date not null default current_date,
  due_date date,
  organization_id uuid not null references organizations(id) on delete restrict,
  counterparty_id uuid not null references contacts(id) on delete restrict,
  -- Which side of the deal this is — set on every kind (quotes/deliveries
  -- are always sale-side; orders default purchase unless subtype=customer;
  -- invoices inherit from what produced them, or from direction).
  flow text not null check (flow in ('sale', 'purchase')),
  -- Invoice-only, independently overridable cash-ledger direction. NOT the
  -- same axis as flow: flow says which side of the deal this is, direction
  -- says which way money actually moved on THIS document (can diverge for
  -- a real refund/interco case) — see netCashFlow() in invoices.ts, kept
  -- exactly as it worked before, just relocated.
  direction text,
  status text,
  totals jsonb,
  notes text,
  -- Self-referential; replaces source_quote_id/source_order_id/
  -- source_delivery_id/original_invoice_id (four separate columns doing
  -- the same "what produced this" job across the old tables).
  source_document_id uuid references documents(id) on delete set null,
  -- Kind-specific extras that don't warrant their own column on every row:
  -- payment_method/counterparty_kind (invoice), driver_name/
  -- vehicle_registration (delivery).
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  unique (organization_id, number),
  constraint documents_subtype_check check (
    (kind = 'invoice' and subtype in ('standard', 'credit', 'debit'))
    or (kind = 'order' and subtype in ('supplier', 'interco', 'customer'))
    or (kind in ('quote', 'delivery') and subtype is null)
  ),
  constraint documents_direction_check check (
    (kind = 'invoice' and direction in ('in', 'out'))
    or (kind <> 'invoice' and direction is null)
  ),
  constraint documents_status_check check (
    (kind = 'quote' and status in ('draft', 'sent', 'accepted', 'rejected'))
    or (kind in ('delivery', 'order') and status in ('draft', 'final'))
    or (kind = 'invoice' and status is null)
  )
);

create index idx_documents_organization on documents(organization_id);
create index idx_documents_kind on documents(kind);
create index idx_documents_counterparty on documents(counterparty_id);
create index idx_documents_date on documents(date);
create index idx_documents_source on documents(source_document_id);
create index idx_documents_number on documents(number);

create table document_lines (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references documents(id) on delete cascade,
  article_id uuid references articles(id) on delete set null,
  code text not null,
  designation text not null,
  unit text,
  quantity numeric(12,2) not null default 1,
  unit_price_excl_tax numeric(12,2) not null default 0,
  discount_percent numeric(5,2) default 0,
  tax_charges jsonb not null default '[]'::jsonb,
  -- For quote-kind lines: an estimate to show the customer (never creates
  -- real consignment_lines rows). For invoice-kind lines: unused (stays
  -- '[]') — the real charge ledger is consignment_lines, unchanged, just
  -- repointed to document_id below.
  consignments jsonb not null default '[]'::jsonb
);

create index idx_document_lines_document on document_lines(document_id);
create index idx_document_lines_article on document_lines(article_id);

-- ============================================
-- BACKFILL — every id preserved exactly
-- ============================================

insert into documents (id, kind, subtype, number, date, due_date, organization_id, counterparty_id, flow, direction, status, totals, notes, source_document_id, attributes, created_at)
select
  id, 'quote', null, number, date, null, organization_id, counterparty_id,
  'sale', null, status::text,
  jsonb_build_object(
    'subtotal_excl_tax', totals->'htSubtotal',
    'chargesByKey', totals->'chargesByKey',
    'total_incl_tax', totals->'ttc'
  ),
  notes, null, '{}'::jsonb, created_at
from quotes;

insert into documents (id, kind, subtype, number, date, due_date, organization_id, counterparty_id, flow, direction, status, totals, notes, source_document_id, attributes, created_at)
select
  id, 'invoice', type::text, number, date, due_date, organization_id, counterparty_id,
  case
    when source_quote_id is not null then 'sale'
    when source_order_id is not null then 'purchase'
    when direction = 'in' then 'sale'
    else 'purchase'
  end,
  direction, null,
  jsonb_build_object(
    'subtotal_excl_tax', totals->'htSubtotal',
    'chargesByKey', totals->'chargesByKey',
    'total_incl_tax', totals->'ttc'
  ),
  notes,
  coalesce(source_quote_id, source_order_id, source_delivery_id, original_invoice_id),
  jsonb_strip_nulls(jsonb_build_object('payment_method', payment_method, 'counterparty_kind', counterparty_kind)),
  created_at
from invoices;

insert into documents (id, kind, subtype, number, date, due_date, organization_id, counterparty_id, flow, direction, status, totals, notes, source_document_id, attributes, created_at)
select
  id, 'delivery', null, number, date, null, organization_id, counterparty_id,
  'sale', null, status::text, null, null, source_quote_id,
  jsonb_strip_nulls(jsonb_build_object('driver_name', driver_name, 'vehicle_registration', vehicle_registration)),
  created_at
from deliveries;

insert into documents (id, kind, subtype, number, date, due_date, organization_id, counterparty_id, flow, direction, status, totals, notes, source_document_id, attributes, created_at)
select
  id, 'order', type::text, number, date, null, organization_id, counterparty_id,
  case when type = 'customer' then 'sale' else 'purchase' end,
  null, status::text, null, null, null, '{}'::jsonb, created_at
from orders;

insert into document_lines (id, document_id, article_id, code, designation, unit, quantity, unit_price_excl_tax, discount_percent, tax_charges, consignments)
select id, quote_id, article_id, code, designation, unit, quantity, unit_price_puht, remise_percent, tax_charges, consignments
from quote_lines;

insert into document_lines (id, document_id, article_id, code, designation, unit, quantity, unit_price_excl_tax, discount_percent, tax_charges, consignments)
select id, invoice_id, article_id, code, designation, unit, quantity, unit_price_puht, remise_percent, tax_charges, '[]'::jsonb
from invoice_lines;

insert into document_lines (id, document_id, article_id, code, designation, unit, quantity, unit_price_excl_tax, discount_percent, tax_charges, consignments)
select id, delivery_id, article_id, code, designation, unit, quantity, 0, 0, '[]'::jsonb, '[]'::jsonb
from delivery_lines;

insert into document_lines (id, document_id, article_id, code, designation, unit, quantity, unit_price_excl_tax, discount_percent, tax_charges, consignments)
select id, order_id, null, code, designation, unit, quantity, coalesce(unit_price, 0), 0, '[]'::jsonb, '[]'::jsonb
from order_lines;

-- ============================================
-- REPOINT ADJACENT TABLES
-- ============================================

alter table consignment_lines rename column invoice_id to document_id;
alter table consignment_lines drop constraint if exists consignment_lines_invoice_id_fkey;
alter table consignment_lines add constraint consignment_lines_document_id_fkey foreign key (document_id) references documents(id) on delete cascade;
alter table consignment_lines drop constraint if exists consignment_lines_source_line_id_fkey;
alter table consignment_lines add constraint consignment_lines_source_line_id_fkey foreign key (source_line_id) references document_lines(id) on delete cascade;

alter table consignment_lines drop constraint if exists consignment_lines_origin_check;
alter table consignment_lines add constraint consignment_lines_origin_check check (
  (document_id is not null and source_line_id is not null
    and organization_id is null and counterparty_id is null and direction is null and date is null)
  or
  (document_id is null and source_line_id is null
    and organization_id is not null and counterparty_id is not null and direction is not null and date is not null)
);

drop index if exists idx_consignment_lines_invoice;
create index idx_consignment_lines_document on consignment_lines(document_id) where document_id is not null;

alter table stock_movements rename column source_id to source_document_id;
alter table stock_movements add constraint stock_movements_source_document_id_fkey foreign key (source_document_id) references documents(id) on delete set null;

alter table document_attachments add constraint document_attachments_document_id_fkey foreign key (document_id) references documents(id) on delete cascade;

alter table issue_lines add column if not exists article_id uuid references articles(id) on delete set null;
create index if not exists idx_issue_lines_article on issue_lines(article_id);

create or replace view consignment_balances as
select
  coalesce(cl.organization_id, doc.organization_id) as organization_id,
  coalesce(cl.counterparty_id, doc.counterparty_id) as counterparty_id,
  cl.packaging_type,
  sum(cl.quantity) as quantity_outstanding,
  sum(cl.total) as deposit_outstanding
from consignment_lines cl
left join documents doc on doc.id = cl.document_id
group by 1, 2, 3;

-- ============================================
-- IMMUTABILITY — invoices are immutable; corrections go through a
-- credit/debit note (subtype + source_document_id), not an edit. Same
-- function body as before, now attached to documents and scoped to
-- kind='invoice' via WHEN.
-- ============================================

create or replace function forbid_invoice_mutation()
returns trigger as $$
begin
  raise exception 'invoices are immutable; issue a credit/debit note instead';
end;
$$ language plpgsql;

create trigger documents_no_update_invoice
  before update or delete on documents
  for each row
  when (OLD.kind = 'invoice')
  execute function forbid_invoice_mutation();

-- ============================================
-- RLS
-- ============================================

alter table documents enable row level security;
alter table document_lines enable row level security;

create policy "Users can view documents"
  on documents for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create documents"
  on documents for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

-- Invoices get no path to UPDATE here either (matching invoices' old "no
-- update policy" stance) — the trigger above is the second, belt-and-
-- suspenders layer for the same rule.
create policy "Users can update documents"
  on documents for update
  to authenticated
  using (organization_id in (select public.user_organization_ids()) and kind <> 'invoice')
  with check (organization_id in (select public.user_organization_ids()) and kind <> 'invoice');

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

drop policy if exists "Users can view consignment lines" on consignment_lines;
drop policy if exists "Users can manage consignment lines" on consignment_lines;

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

-- ============================================
-- DROP OLD TABLES — every row already backfilled into documents/document_lines
-- ============================================

drop table quote_lines cascade;
drop table invoice_lines cascade;
drop table delivery_lines cascade;
drop table order_lines cascade;
drop table invoices cascade;
drop table orders cascade;
drop table deliveries cascade;
drop table quotes cascade;

notify pgrst, 'reload schema';
