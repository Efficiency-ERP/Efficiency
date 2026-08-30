-- Outstanding deposit liability per counterparty + packaging type, in one
-- place: charge rows (invoice_id set) derive counterparty/org via their
-- invoice; return rows (invoice_id null) already carry them directly.
-- quantity/total net to zero once everything charged has been returned.
create or replace view consignment_balances as
select
  coalesce(cl.organization_id, inv.organization_id) as organization_id,
  coalesce(cl.counterparty_id, inv.counterparty_id) as counterparty_id,
  cl.packaging_type,
  sum(cl.quantity) as quantity_outstanding,
  sum(cl.total) as deposit_outstanding
from consignment_lines cl
left join invoices inv on inv.id = cl.invoice_id
group by 1, 2, 3;

notify pgrst, 'reload schema';
