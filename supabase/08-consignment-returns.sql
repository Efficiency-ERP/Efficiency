-- Lets a consignment_lines row stand alone as a return, not just be tied to
-- an invoice's deposit charge. Both kinds of row live in the same table so
-- "what's currently outstanding" is one sum over one table, never a union:
--   sum(quantity) grouped by counterparty + packaging_type
-- A charge row (invoice_id set) has a positive quantity — packaging units
-- that just went out. A return row (invoice_id null) has a negative
-- quantity — units that just came back — so the two net against each other
-- directly, the same convention stock_movements already uses
-- (quantity_delta, signed) for the analogous product-stock ledger.
--
-- A charge row's counterparty/org/date are derived via its invoice (no
-- reason to duplicate them); a return row has no invoice to derive them
-- from, so it carries them directly. The check constraint enforces that
-- split — a row is a charge or a return, never a partial mix of both.

alter table consignment_lines alter column invoice_id drop not null;
alter table consignment_lines alter column source_line_id drop not null;

alter table consignment_lines add column organization_id uuid references organizations(id);
alter table consignment_lines add column counterparty_id uuid references contacts(id);
alter table consignment_lines add column date date;
alter table consignment_lines add column direction text check (direction in ('in', 'out'));
alter table consignment_lines add column notes text;

alter table consignment_lines add constraint consignment_lines_origin_check check (
  (invoice_id is not null and source_line_id is not null
    and organization_id is null and counterparty_id is null and direction is null and date is null)
  or
  (invoice_id is null and source_line_id is null
    and organization_id is not null and counterparty_id is not null and direction is not null and date is not null)
);

create index idx_consignment_lines_counterparty on consignment_lines(counterparty_id) where counterparty_id is not null;
create index idx_consignment_lines_invoice on consignment_lines(invoice_id) where invoice_id is not null;

notify pgrst, 'reload schema';
