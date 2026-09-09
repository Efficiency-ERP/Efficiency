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

-- Only issues (goods-issue) still uses this — quote/invoice/delivery/order
-- status values now live as plain text on documents, constrained per-kind
-- by documents_status_check rather than a shared enum.
do $$ begin
  create type document_status as enum ('draft', 'final');
exception when duplicate_object then null;
end $$;

-- ============================================
-- TABLES
-- ============================================

-- A tenant is the account-level owner of one or more organizations. Joining
-- a tenant (via user_tenants) grants access to every org under it,
-- including ones added later — no per-org membership row needed.
create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
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

-- A tenant of quote/invoice/delivery/order — the four steps that are all
-- on the way to money, all counterparty-driven, all linked via the same
-- backward-FK chain (source_document_id, self-referential — replaces the
-- old source_quote_id/source_order_id/source_delivery_id/
-- original_invoice_id). Every row keeps the identity of what it was
-- before the merge; only the container changed.
--
-- Invoices are immutable once created (see documents_no_update_invoice
-- trigger below), so a wrong invoice is corrected with a credit/debit note
-- (subtype + source_document_id), not edited. `direction` is invoice-only
-- and independently overridable for real cash-ledger edge cases (refunds,
-- interco) — it is NOT the same axis as `flow` (which side of the deal
-- this is, set on every kind).
--
-- `issues` (goods-issue, stock-only) is deliberately NOT part of this
-- table: it must never gain a financial/invoice link, so that boundary is
-- kept at the schema level rather than a constraint someone has to
-- remember — see below.
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (kind in ('quote', 'invoice', 'delivery', 'order')),
  subtype text,
  number text not null,
  date date not null default current_date,
  due_date date,
  organization_id uuid not null references organizations(id) on delete restrict,
  counterparty_id uuid not null references contacts(id) on delete restrict,
  flow text not null check (flow in ('sale', 'purchase')),
  direction text,
  status text,
  totals jsonb,
  notes text,
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

create table if not exists document_lines (
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
  -- '[]') — the real charge ledger is consignment_lines, keyed by
  -- document_id below.
  consignments jsonb not null default '[]'::jsonb
);

-- A row is either a charge (tied to the invoice line whose article implied
-- it, quantity positive) or a standalone return (document_id null, quantity
-- negative, org/counterparty/date/direction carried directly since there's
-- no document to derive them from) — never a mix, enforced by the check
-- constraint below. Outstanding deposit liability per counterparty +
-- packaging_type is always sum(quantity) over this one table.
create table if not exists consignment_lines (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references documents(id) on delete cascade,
  source_line_id uuid references document_lines(id) on delete cascade,
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
    (document_id is not null and source_line_id is not null
      and organization_id is null and counterparty_id is null and direction is null and date is null)
    or
    (document_id is null and source_line_id is null
      and organization_id is not null and counterparty_id is not null and direction is not null and date is not null)
  )
);
create index if not exists idx_consignment_lines_counterparty on consignment_lines(counterparty_id) where counterparty_id is not null;
create index if not exists idx_consignment_lines_document on consignment_lines(document_id) where document_id is not null;

-- Ledger of stock in/out movements. Deliveries write "out" rows for any line
-- tied to an article_id; articles.stock.onHand is kept in sync on write.
create table if not exists stock_movements (
  id uuid primary key default uuid_generate_v4(),
  article_id uuid not null references articles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete restrict,
  quantity_delta numeric(12,2) not null,
  direction text not null,
  source_type text not null,
  source_document_id uuid references documents(id) on delete set null,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Warehouse Issue (BS): a stock-only correction document. It must never
-- gain a financial/invoice link — that's the whole point of it existing
-- separately from documents above.
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
  article_id uuid references articles(id) on delete set null,
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

create table if not exists user_tenants (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  primary key (user_id, tenant_id)
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
create index if not exists idx_documents_organization on documents(organization_id);
create index if not exists idx_documents_kind on documents(kind);
create index if not exists idx_documents_counterparty on documents(counterparty_id);
create index if not exists idx_documents_date on documents(date);
create index if not exists idx_documents_source on documents(source_document_id);
create index if not exists idx_documents_number on documents(number);
create index if not exists idx_document_lines_document on document_lines(document_id);
create index if not exists idx_document_lines_article on document_lines(article_id);
create index if not exists idx_stock_movements_article on stock_movements(article_id);
create index if not exists idx_stock_movements_organization on stock_movements(organization_id);
create index if not exists idx_stock_movements_date on stock_movements(date desc);
create index if not exists idx_issues_number on issues(number);
create index if not exists idx_issues_organization on issues(organization_id);
create index if not exists idx_issue_lines_article on issue_lines(article_id);
create index if not exists idx_logs_organization on logs(organization_id);
create index if not exists idx_logs_created_at on logs(created_at desc);
create index if not exists idx_user_tenants_user on user_tenants(user_id);
create index if not exists idx_user_tenants_tenant on user_tenants(tenant_id);
create index if not exists idx_organizations_tenant on organizations(tenant_id);

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
-- credit/debit note (subtype + source_document_id) instead. Scoped to
-- kind='invoice' via WHEN, since documents also holds quote/delivery/order
-- rows that stay editable.
create or replace function forbid_invoice_mutation()
returns trigger as $$
begin
  raise exception 'invoices are immutable; issue a credit/debit note instead';
end;
$$ language plpgsql;

drop trigger if exists documents_no_update_invoice on documents;
create trigger documents_no_update_invoice
  before update or delete on documents
  for each row
  when (OLD.kind = 'invoice')
  execute function forbid_invoice_mutation();
