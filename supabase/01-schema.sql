-- ============================================
-- 01 SCHEMA — Run first
-- Extensions, enums, tables, indexes, functions.
-- Safe to re-run (never drops data). Run 00-reset.sql
-- first if you want a clean slate.
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

do $$ begin
  create type article_type as enum ('product', 'service');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type invoice_type as enum ('standard', 'credit', 'debit');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type counterparty_kind as enum ('contact', 'organization');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type order_type as enum ('supplier', 'interco', 'customer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type document_status as enum ('draft', 'final');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type quote_status as enum ('draft', 'sent', 'accepted', 'rejected');
exception when duplicate_object then null;
end $$;

-- ============================================
-- TABLES
-- ============================================

create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  mf text,
  unique_id text,
  address jsonb default '{"line1": "", "city": "", "zipCode": "", "country": "Tunisie"}'::jsonb,
  contact jsonb default '{"phone": "", "fax": null}'::jsonb,
  conditions_de_vente text,
  created_at timestamptz default now()
);

-- party_type is free text (not an enum) so contacts can be tagged with any
-- custom type (e.g. "Distributeur", "Transporteur") via the "Other..." option.
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  party_type text not null default 'customer',
  is_internal_org boolean default false,
  internal_organization_id uuid references organizations(id) on delete set null,
  company_name text not null,
  mf text,
  unique_id text,
  address jsonb default '{"line1": "", "city": "", "zipCode": "", "country": "Tunisie"}'::jsonb,
  contact jsonb default '{"phone": "", "fax": null}'::jsonb,
  conditions_de_vente text,
  archived boolean default false,
  created_at timestamptz default now()
);

-- tax_charges is an ordered list of {id, label, rate, base} objects, replacing
-- fixed vat_rate/dc_rate columns so articles can carry any number of charges.
create table if not exists articles (
  id uuid primary key default uuid_generate_v4(),
  type article_type not null default 'product',
  code text not null,
  designation text not null,
  organization_id uuid references organizations(id) on delete set null,
  unit text,
  unit_price_puht numeric(12,2) not null default 0,
  transfer_price numeric(12,2) not null default 0,
  tax_charges jsonb not null default '[{"id":"vat","label":"TVA","rate":19,"base":"ht"},{"id":"dc","label":"DC","rate":1,"base":"ht"}]'::jsonb,
  stock jsonb default '{"onHand": 0, "minStock": 0}'::jsonb,
  consignment jsonb default '{"enabled": false, "packaging": []}'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

-- Quotes (devis) are the editable, pre-money document in the sales flow.
-- Validating a quote creates an immutable Invoice — see invoices below.
create table if not exists quotes (
  id uuid primary key default uuid_generate_v4(),
  number text not null,
  date date not null default current_date,
  organization_id uuid not null references organizations(id) on delete restrict,
  counterparty_id uuid not null references contacts(id) on delete restrict,
  status quote_status not null default 'draft',
  totals jsonb default '{"htSubtotal": 0, "chargesByKey": {}, "ttc": 0}'::jsonb,
  notes text,
  created_at timestamptz default now(),
  unique (organization_id, number)
);

create table if not exists quote_lines (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  article_id uuid references articles(id) on delete set null,
  code text not null,
  designation text not null,
  unit text,
  quantity numeric(12,2) not null default 1,
  unit_price_puht numeric(12,2) not null default 0,
  remise_percent numeric(5,2) default 0,
  tax_charges jsonb not null default '[]'::jsonb,
  -- An estimate to show the customer on the quote itself — a quote never
  -- creates real consignment_lines rows (nothing's been charged yet), so
  -- this is the only place a quote's packaging selection is remembered.
  consignments jsonb not null default '[]'::jsonb
);

-- Invoices are immutable once created (see forbid_invoice_mutation trigger
-- below) and sequentially numbered — no status field: a wrong invoice is
-- corrected with a credit/debit note (type + original_invoice_id), not
-- edited. direction records whether this invoice is money in or out; it
-- defaults from the flow that created it (sale vs purchase) but can be
-- overridden per-invoice for edge cases (interco, refunds).
--
-- Every invoice that was confirmed from an upstream document carries a
-- backward FK to it (source_order_id / source_quote_id / source_delivery_id)
-- — never the reverse. This is the one rule for "was X converted downstream":
-- always a nullable FK on the later document, never a forward pointer stored
-- on the earlier one (which would wrongly cap it at a single invoice) and
-- never a bolted-on status flag standing in for the link.
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  number text not null,
  date date not null default current_date,
  due_date date,
  organization_id uuid not null references organizations(id) on delete restrict,
  counterparty_kind counterparty_kind not null default 'contact',
  counterparty_id uuid not null references contacts(id) on delete restrict,
  type invoice_type not null default 'standard',
  direction text not null default 'in' check (direction in ('in', 'out')),
  payment_method text,
  totals jsonb default '{"htSubtotal": 0, "chargesByKey": {}, "ttc": 0}'::jsonb,
  source_quote_id uuid references quotes(id) on delete set null,
  original_invoice_id uuid references invoices(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  unique (organization_id, number)
);

create table if not exists invoice_lines (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  article_id uuid references articles(id) on delete set null,
  code text not null,
  designation text not null,
  unit text,
  quantity numeric(12,2) not null default 1,
  unit_price_puht numeric(12,2) not null default 0,
  remise_percent numeric(5,2) default 0,
  tax_charges jsonb not null default '[]'::jsonb
);

-- A row is either a charge (tied to the invoice line whose article implied
-- it, quantity positive) or a standalone return (invoice_id null, quantity
-- negative, org/counterparty/date/direction carried directly since there's
-- no invoice to derive them from) — never a mix, enforced by the check
-- constraint below. Outstanding deposit liability per counterparty +
-- packaging_type is always sum(quantity) over this one table.
create table if not exists consignment_lines (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id) on delete cascade,
  source_line_id uuid references invoice_lines(id) on delete cascade,
  organization_id uuid references organizations(id),
  counterparty_id uuid references contacts(id),
  date date,
  direction text check (direction in ('in', 'out')),
  notes text,
  packaging_type text not null,
  units_per_article numeric(12,2) not null default 1,
  quantity numeric(12,2) not null default 0,
  deposit_value numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  constraint consignment_lines_origin_check check (
    (invoice_id is not null and source_line_id is not null
      and organization_id is null and counterparty_id is null and direction is null and date is null)
    or
    (invoice_id is null and source_line_id is null
      and organization_id is not null and counterparty_id is not null and direction is not null and date is not null)
  )
);
create index if not exists idx_consignment_lines_counterparty on consignment_lines(counterparty_id) where counterparty_id is not null;
create index if not exists idx_consignment_lines_invoice on consignment_lines(invoice_id) where invoice_id is not null;

-- Delivery Note (BL). Optional step in the sales flow, after a quote and
-- before/alongside the invoice.
create table if not exists deliveries (
  id uuid primary key default uuid_generate_v4(),
  number text not null,
  date date not null default current_date,
  organization_id uuid not null references organizations(id) on delete restrict,
  counterparty_id uuid not null references contacts(id) on delete restrict,
  driver_name text,
  vehicle_registration text,
  status document_status not null default 'draft',
  source_quote_id uuid references quotes(id) on delete set null,
  created_at timestamptz default now(),
  unique (organization_id, number)
);

create table if not exists delivery_lines (
  id uuid primary key default uuid_generate_v4(),
  delivery_id uuid not null references deliveries(id) on delete cascade,
  article_id uuid references articles(id) on delete set null,
  code text not null,
  designation text not null,
  unit text,
  quantity numeric(12,2) not null default 1
);

-- Ledger of stock in/out movements. Deliveries write "out" rows for any line
-- tied to an article_id; articles.stock.onHand is kept in sync on write.
create table if not exists stock_movements (
  id uuid primary key default uuid_generate_v4(),
  article_id uuid not null references articles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete restrict,
  quantity_delta numeric(12,2) not null,
  direction text not null,
  source_type text not null,
  source_id uuid,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Supplier Order (BC). Confirmed by an invoice that references it back
-- (invoices.source_order_id — see the invoices table above); the order
-- itself carries no forward pointer, since "was this order invoiced" is
-- always a lookup, not a stored flag (keeps the same rule as Quote/Delivery
-- and correctly allows more than one invoice per order later, e.g. partial
-- invoicing or corrections).
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  number text not null,
  date date not null default current_date,
  organization_id uuid not null references organizations(id) on delete restrict,
  counterparty_id uuid not null references contacts(id) on delete restrict,
  type order_type not null default 'supplier',
  status document_status not null default 'draft',
  created_at timestamptz default now(),
  unique (organization_id, number)
);

-- Added here (after orders/deliveries exist) rather than inline on the
-- invoices table above, purely for create-order-within-this-file reasons.
alter table invoices add column if not exists source_order_id uuid references orders(id) on delete set null;
alter table invoices add column if not exists source_delivery_id uuid references deliveries(id) on delete set null;

create table if not exists order_lines (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  code text not null,
  designation text not null,
  unit text,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2)
);

-- Warehouse Issue (BS): a stock-only correction document. It must never
-- gain a financial/invoice link — that's the whole point of it existing
-- separately from Orders/Deliveries.
create table if not exists issues (
  id uuid primary key default uuid_generate_v4(),
  number text not null,
  date date not null default current_date,
  organization_id uuid not null references organizations(id) on delete restrict,
  counterparty_id uuid not null references contacts(id) on delete restrict,
  status document_status not null default 'draft',
  created_at timestamptz default now(),
  unique (organization_id, number)
);

create table if not exists issue_lines (
  id uuid primary key default uuid_generate_v4(),
  issue_id uuid not null references issues(id) on delete cascade,
  code text not null,
  designation text not null,
  unit text,
  quantity numeric(12,2) not null default 1
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text default 'user',
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists user_organizations (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  primary key (user_id, organization_id)
);

create table if not exists logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  module text not null,
  message text not null,
  target_id text,
  organization_id uuid references organizations(id) on delete set null,
  created_at timestamptz default now()
);

-- Backs next_document_number(): one row per (org, document prefix, YYMM
-- period), incremented atomically on every call.
create table if not exists document_counters (
  organization_id uuid not null references organizations(id) on delete cascade,
  prefix text not null,
  period text not null,
  next_number int not null default 1,
  primary key (organization_id, prefix, period)
);

-- ============================================
-- INDEXES
-- ============================================

create index if not exists idx_contacts_company_name on contacts(company_name);
create index if not exists idx_contacts_internal_org on contacts(internal_organization_id);
create index if not exists idx_articles_code on articles(code);
create index if not exists idx_articles_organization on articles(organization_id);
create index if not exists idx_quotes_number on quotes(number);
create index if not exists idx_quotes_organization on quotes(organization_id);
create index if not exists idx_quote_lines_quote on quote_lines(quote_id);
create index if not exists idx_invoices_number on invoices(number);
create index if not exists idx_invoices_organization on invoices(organization_id);
create index if not exists idx_invoices_counterparty on invoices(counterparty_id);
create index if not exists idx_invoices_date on invoices(date);
create index if not exists idx_invoices_source_quote on invoices(source_quote_id);
create index if not exists idx_invoices_source_order on invoices(source_order_id);
create index if not exists idx_invoices_source_delivery on invoices(source_delivery_id);
create index if not exists idx_invoices_original_invoice on invoices(original_invoice_id);
create index if not exists idx_invoice_lines_invoice on invoice_lines(invoice_id);
create index if not exists idx_deliveries_number on deliveries(number);
create index if not exists idx_deliveries_organization on deliveries(organization_id);
create index if not exists idx_delivery_lines_article on delivery_lines(article_id);
create index if not exists idx_stock_movements_article on stock_movements(article_id);
create index if not exists idx_stock_movements_organization on stock_movements(organization_id);
create index if not exists idx_stock_movements_date on stock_movements(date desc);
create index if not exists idx_orders_number on orders(number);
create index if not exists idx_orders_organization on orders(organization_id);
create index if not exists idx_issues_number on issues(number);
create index if not exists idx_issues_organization on issues(organization_id);
create index if not exists idx_logs_organization on logs(organization_id);
create index if not exists idx_logs_created_at on logs(created_at desc);
create index if not exists idx_user_organizations_user on user_organizations(user_id);
create index if not exists idx_user_organizations_org on user_organizations(organization_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop old trigger if exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomically issues the next sequential number for a document type, per
-- organization per month (e.g. next_document_number(org_id, 'I') ->
-- 'I-2608-00001'). security definer so clients never need direct access
-- to document_counters (see 02-rls.sql).
create or replace function next_document_number(p_org_id uuid, p_prefix text)
returns text as $$
declare
  v_period text := to_char(current_date, 'YYMM');
  v_next int;
begin
  insert into document_counters (organization_id, prefix, period, next_number)
  values (p_org_id, p_prefix, v_period, 2)
  on conflict (organization_id, prefix, period)
  do update set next_number = document_counters.next_number + 1
  returning next_number - 1 into v_next;

  return p_prefix || '-' || v_period || '-' || lpad(v_next::text, 5, '0');
end;
$$ language plpgsql security definer;

-- Invoices are immutable: no UPDATE, no DELETE. Corrections go through a
-- credit/debit note (type + original_invoice_id) instead.
create or replace function forbid_invoice_mutation()
returns trigger as $$
begin
  raise exception 'invoices are immutable; issue a credit/debit note instead';
end;
$$ language plpgsql;

drop trigger if exists invoices_no_update on invoices;
create trigger invoices_no_update
  before update or delete on invoices
  for each row execute function forbid_invoice_mutation();
