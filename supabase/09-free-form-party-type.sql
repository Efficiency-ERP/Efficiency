-- ============================================
-- 9/9 FREE-FORM PARTY TYPE — Run after flexible tax charges
-- Replaces the fixed party_type enum ('customer'/'supplier'/'both')
-- with free text, so contacts can be tagged with any custom type
-- (e.g. "Distributeur", "Transporteur") via the "Other..." option.
-- Safe to re-run
-- ============================================

alter table if exists contacts
  alter column party_type type text using party_type::text;

alter table if exists contacts
  alter column party_type set default 'customer';

drop type if exists party_type;
