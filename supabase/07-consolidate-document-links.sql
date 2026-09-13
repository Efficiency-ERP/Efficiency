-- ============================================
-- 07 CONSOLIDATE DOCUMENT LINKS — Run after 06
-- Moves the Order<->Invoice link to match Quote<->Invoice and
-- Quote<->Delivery: a nullable FK on the later document pointing back to
-- the one that produced it, never a forward pointer stored on the earlier
-- one (which wrongly caps an order at exactly one invoice).
-- Safe to re-run (never drops data)
-- ============================================

alter table invoices add column if not exists source_order_id uuid references orders(id) on delete set null;
alter table invoices add column if not exists source_delivery_id uuid references deliveries(id) on delete set null;

create index if not exists idx_invoices_source_order on invoices(source_order_id);
create index if not exists idx_invoices_source_delivery on invoices(source_delivery_id);

-- Backfill any existing order->invoice links (orders.source_invoice_id) onto
-- the new invoice-side column before the old one is dropped.
update invoices i
set source_order_id = o.id
from orders o
where o.source_invoice_id = i.id
  and i.source_order_id is null;

alter table orders drop column if exists source_invoice_id;

notify pgrst, 'reload schema';
