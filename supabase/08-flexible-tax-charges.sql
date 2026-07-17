-- ============================================
-- 8/8 FLEXIBLE TAX CHARGES — Run after payment method
-- Replaces fixed vat_rate/dc_rate columns with a generic,
-- ordered list of tax charges (label + rate + base) per
-- article and per invoice line.
-- Safe to re-run
-- ============================================

-- Articles: add tax_charges, backfill from vat_rate/dc_rate, drop old columns
alter table if exists articles
  add column if not exists tax_charges jsonb not null default '[{"id":"vat","label":"TVA","rate":19,"base":"ht"},{"id":"dc","label":"DC","rate":1,"base":"ht"}]'::jsonb;

update articles
set tax_charges = jsonb_build_array(
  jsonb_build_object('id', 'vat', 'label', 'TVA', 'rate', vat_rate, 'base', 'ht'),
  jsonb_build_object('id', 'dc', 'label', 'DC', 'rate', dc_rate, 'base', 'ht')
)
where vat_rate is not null and dc_rate is not null;

alter table if exists articles
  drop column if exists vat_rate,
  drop column if exists dc_rate;

-- Invoice lines: same pattern
alter table if exists invoice_lines
  add column if not exists tax_charges jsonb not null default '[]'::jsonb;

update invoice_lines
set tax_charges = jsonb_build_array(
  jsonb_build_object('id', 'vat', 'label', 'TVA', 'rate', vat_rate, 'base', 'ht'),
  jsonb_build_object('id', 'dc', 'label', 'DC', 'rate', dc_rate, 'base', 'ht')
)
where vat_rate is not null and dc_rate is not null;

alter table if exists invoice_lines
  drop column if exists vat_rate,
  drop column if exists dc_rate;

-- Invoices: new totals default shape (chargesByKey replaces vatByRate/dcByRate)
alter table if exists invoices
  alter column totals set default '{"htSubtotal": 0, "chargesByKey": {}, "ttc": 0}'::jsonb;

-- Drop the old fixed VAT/DC totals function — unused by the app (totals are
-- computed and written from the client), and it would drift out of sync
-- with the new tax_charges model.
drop function if exists compute_invoice_totals(uuid);
