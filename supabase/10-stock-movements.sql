-- ============================================
-- 10 STOCK MOVEMENTS — Run after free-form party type
-- Adds a stock movement ledger and links delivery_lines to articles,
-- so deliveries automatically record stock-out movements.
-- Safe to re-run
-- ============================================

alter table if exists delivery_lines
  add column if not exists article_id uuid references articles(id) on delete set null;

create index if not exists idx_delivery_lines_article on delivery_lines(article_id);

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

create index if not exists idx_stock_movements_article on stock_movements(article_id);
create index if not exists idx_stock_movements_organization on stock_movements(organization_id);
create index if not exists idx_stock_movements_date on stock_movements(date desc);

alter table if exists stock_movements enable row level security;

drop policy if exists "Users can view stock movements" on stock_movements;
drop policy if exists "Users can create stock movements" on stock_movements;

create policy "Users can view stock movements"
  on stock_movements for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create stock movements"
  on stock_movements for insert
  to authenticated
  with check (true);
