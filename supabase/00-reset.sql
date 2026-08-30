-- ============================================
-- 00 RESET — Run manually, before 01-05, only when
-- you want to wipe all document/transaction data and
-- rebuild the schema from scratch.
--
-- Drops: invoices, orders, deliveries, issues, quotes
-- (and their line tables), stock movements, document
-- counters, and the enums tied to them.
--
-- Does NOT touch: tenants, organizations, contacts, articles,
-- profiles, user_tenants, logs, or the feedback
-- tables — those aren't part of the document model.
-- ============================================

drop table if exists consignment_lines cascade;
drop table if exists invoice_lines cascade;
drop table if exists invoices cascade;
drop table if exists quote_lines cascade;
drop table if exists quotes cascade;
drop table if exists delivery_lines cascade;
drop table if exists deliveries cascade;
drop table if exists order_lines cascade;
drop table if exists orders cascade;
drop table if exists issue_lines cascade;
drop table if exists issues cascade;
drop table if exists stock_movements cascade;
drop table if exists document_counters cascade;
drop table if exists document_attachments cascade;

drop function if exists next_document_number(uuid, text);
drop function if exists forbid_invoice_mutation();

drop type if exists invoice_status;
drop type if exists invoice_type;
drop type if exists order_type;
drop type if exists document_status;
drop type if exists quote_status;
