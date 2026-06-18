-- ============================================
-- 7/7 INVOICE PAYMENT METHOD — Run after feedback notes
-- Adds "mode de paiement" to invoices
-- Safe to re-run
-- ============================================

alter table if exists invoices
  add column if not exists payment_method text;
