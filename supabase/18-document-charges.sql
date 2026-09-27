-- ============================================
-- 18 DOCUMENT-LEVEL CHARGES
--
-- Every charge was per-line and percentage-only: TaxCharge is
-- {id, label, rate, base} and computeInvoiceTotals worked each one out as
-- (base * rate) / 100. Tunisia's timbre fiscal fits neither half of that —
-- it is a flat dinar amount, and it applies once to the invoice rather than
-- to any particular line. The usual workaround (a fake line item) pollutes
-- the line table and would serialize into TEIF as a product.
--
-- documents.charges holds charges applied once to the whole document:
--   { id, label, kind: 'percent' | 'fixed', rate?, amount?, base? }
--
-- Defaulting to '[]' keeps every existing document's totals byte-identical.
-- ============================================

alter table documents add column if not exists charges jsonb not null default '[]'::jsonb;

-- The stamp's legal amount changes with each finance law, so it is stored per
-- organization and prefilled into new invoices rather than hardcoded in the
-- app — a tenant can correct it without waiting for a deploy.
alter table organizations add column if not exists stamp_duty numeric(12,3);
