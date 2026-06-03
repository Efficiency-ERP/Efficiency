-- Efficiency Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- DROP EXISTING (if re-running)
-- ============================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists compute_invoice_totals(uuid) cascade;

drop table if exists issue_lines cascade;
drop table if exists issues cascade;
drop table if exists order_lines cascade;
drop table if exists orders cascade;
drop table if exists delivery_lines cascade;
drop table if exists deliveries cascade;
drop table if exists consignment_lines cascade;
drop table if exists invoice_lines cascade;
drop table if exists invoices cascade;
drop table if exists articles cascade;
drop table if exists contacts cascade;
drop table if exists logs cascade;
drop table if exists user_organizations cascade;
drop table if exists profiles cascade;
drop table if exists organizations cascade;

-- ============================================
-- ENUMS
-- ============================================

drop type if exists party_type cascade;
drop type if exists article_type cascade;
drop type if exists invoice_type cascade;
drop type if exists invoice_status cascade;
drop type if exists counterparty_kind cascade;
drop type if exists order_type cascade;
drop type if exists document_status cascade;

create type party_type as enum ('customer', 'supplier', 'both');
create type article_type as enum ('product', 'service');
create type invoice_type as enum ('standard', 'credit', 'debit');
create type invoice_status as enum ('draft', 'sent', 'paid', 'cancelled');
create type counterparty_kind as enum ('contact', 'organization');
create type order_type as enum ('supplier', 'interco', 'customer');
create type document_status as enum ('draft', 'final');

-- ============================================
-- TABLES
-- ============================================

-- Organizations (PME)
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  mf text,
  unique_id text,
  address jsonb default '{"line1": "", "city": "", "zipCode": "", "country": "Tunisie"}'::jsonb,
  contact jsonb default '{"phone": "", "fax": null}'::jsonb,
  conditions_de_vente text,
  created_at timestamptz default now()
);

-- Contacts
create table contacts (
  id uuid primary key default uuid_generate_v4(),
  party_type party_type not null default 'customer',
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

-- Articles
create table articles (
  id uuid primary key default uuid_generate_v4(),
  type article_type not null default 'product',
  code text not null,
  designation text not null,
  organization_id uuid references organizations(id) on delete set null,
  unit text,
  unit_price_puht numeric(12,2) not null default 0,
  transfer_price numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 19,
  dc_rate numeric(5,2) not null default 1,
  stock jsonb default '{"onHand": 0, "minStock": 0}'::jsonb,
  consignment jsonb default '{"enabled": false, "packaging": []}'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

-- Invoices
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  number text not null,
  date date not null default current_date,
  due_date date,
  organization_id uuid not null references organizations(id) on delete restrict,
  counterparty_kind counterparty_kind not null default 'contact',
  counterparty_id uuid not null references contacts(id) on delete restrict,
  type invoice_type not null default 'standard',
  status invoice_status not null default 'draft',
  totals jsonb default '{"htSubtotal": 0, "vatByRate": {}, "dcByRate": {}, "ttc": 0}'::jsonb,
  "references" jsonb default '{}'::jsonb,
  notes text,
  created_at timestamptz default now()
);

-- Invoice Lines
create table invoice_lines (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  article_id uuid references articles(id) on delete set null,
  code text not null,
  designation text not null,
  unit text,
  quantity numeric(12,2) not null default 1,
  unit_price_puht numeric(12,2) not null default 0,
  remise_percent numeric(5,2) default 0,
  vat_rate numeric(5,2) not null default 19,
  dc_rate numeric(5,2) not null default 1
);

-- Consignment Lines
create table consignment_lines (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  source_line_id uuid not null references invoice_lines(id) on delete cascade,
  packaging_type text not null,
  units_per_article numeric(12,2) not null default 1,
  quantity numeric(12,2) not null default 0,
  deposit_value numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0
);

-- Deliveries
create table deliveries (
  id uuid primary key default uuid_generate_v4(),
  number text not null,
  date date not null default current_date,
  organization_id uuid not null references organizations(id) on delete restrict,
  counterparty_id uuid not null references contacts(id) on delete restrict,
  driver_name text,
  vehicle_registration text,
  status document_status not null default 'draft',
  "references" jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Delivery Lines
create table delivery_lines (
  id uuid primary key default uuid_generate_v4(),
  delivery_id uuid not null references deliveries(id) on delete cascade,
  code text not null,
  designation text not null,
  unit text,
  quantity numeric(12,2) not null default 1
);

-- Orders
create table orders (
  id uuid primary key default uuid_generate_v4(),
  number text not null,
  date date not null default current_date,
  organization_id uuid not null references organizations(id) on delete restrict,
  counterparty_id uuid not null references contacts(id) on delete restrict,
  type order_type not null default 'supplier',
  status document_status not null default 'draft',
  created_at timestamptz default now()
);

-- Order Lines
create table order_lines (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  code text not null,
  designation text not null,
  unit text,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2)
);

-- Issues
create table issues (
  id uuid primary key default uuid_generate_v4(),
  number text not null,
  date date not null default current_date,
  organization_id uuid not null references organizations(id) on delete restrict,
  counterparty_id uuid not null references contacts(id) on delete restrict,
  status document_status not null default 'draft',
  "references" jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Issue Lines
create table issue_lines (
  id uuid primary key default uuid_generate_v4(),
  issue_id uuid not null references issues(id) on delete cascade,
  code text not null,
  designation text not null,
  unit text,
  quantity numeric(12,2) not null default 1
);

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text default 'user',
  avatar_url text,
  created_at timestamptz default now()
);

-- User-Organization junction (many-to-many)
create table user_organizations (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  primary key (user_id, organization_id)
);

-- Audit Logs
create table logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  module text not null,
  message text not null,
  target_id text,
  organization_id uuid references organizations(id) on delete set null,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_contacts_company_name on contacts(company_name);
create index idx_contacts_internal_org on contacts(internal_organization_id);
create index idx_articles_code on articles(code);
create index idx_articles_organization on articles(organization_id);
create index idx_invoices_number on invoices(number);
create index idx_invoices_organization on invoices(organization_id);
create index idx_invoices_counterparty on invoices(counterparty_id);
create index idx_invoices_status on invoices(status);
create index idx_invoices_date on invoices(date);
create index idx_invoice_lines_invoice on invoice_lines(invoice_id);
create index idx_deliveries_number on deliveries(number);
create index idx_deliveries_organization on deliveries(organization_id);
create index idx_orders_number on orders(number);
create index idx_orders_organization on orders(organization_id);
create index idx_issues_number on issues(number);
create index idx_issues_organization on issues(organization_id);
create index idx_logs_organization on logs(organization_id);
create index idx_logs_created_at on logs(created_at desc);
create index idx_user_organizations_user on user_organizations(user_id);
create index idx_user_organizations_org on user_organizations(organization_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to compute invoice totals
create or replace function compute_invoice_totals(inv_id uuid)
returns jsonb as $$
declare
  ht_subtotal numeric := 0;
  vat_by_rate jsonb := '{}'::jsonb;
  dc_by_rate jsonb := '{}'::jsonb;
  total_vat numeric := 0;
  total_dc numeric := 0;
  ttc numeric := 0;
  line record;
  remise numeric;
  puht_net numeric;
  ht numeric;
  vat_amount numeric;
  dc_amount numeric;
begin
  for line in
    select * from invoice_lines where invoice_id = inv_id
  loop
    remise := case when line.remise_percent > 0
      then (line.unit_price_puht * line.remise_percent) / 100
      else 0 end;
    puht_net := line.unit_price_puht - remise;
    ht := puht_net * line.quantity;

    vat_amount := (ht * line.vat_rate) / 100;
    dc_amount := (ht * line.dc_rate) / 100;

    ht_subtotal := ht_subtotal + ht;

    -- Accumulate VAT by rate
    if vat_by_rate ? line.vat_rate::text then
      vat_by_rate := vat_by_rate || jsonb_build_object(
        line.vat_rate::text,
        (vat_by_rate->>line.vat_rate::text)::numeric + vat_amount
      );
    else
      vat_by_rate := vat_by_rate || jsonb_build_object(line.vat_rate::text, vat_amount);
    end if;

    -- Accumulate DC by rate
    if dc_by_rate ? line.dc_rate::text then
      dc_by_rate := dc_by_rate || jsonb_build_object(
        line.dc_rate::text,
        (dc_by_rate->>line.dc_rate::text)::numeric + dc_amount
      );
    else
      dc_by_rate := dc_by_rate || jsonb_build_object(line.dc_rate::text, dc_amount);
    end if;
  end loop;

  -- Calculate totals
  select into total_vat coalesce(sum(value::numeric), 0) from jsonb_each_text(vat_by_rate);
  select into total_dc coalesce(sum(value::numeric), 0) from jsonb_each_text(dc_by_rate);
  ttc := ht_subtotal + total_vat + total_dc;

  return jsonb_build_object(
    'htSubtotal', ht_subtotal,
    'vatByRate', vat_by_rate,
    'dcByRate', dc_by_rate,
    'ttc', ttc
  );
end;
$$ language plpgsql;
