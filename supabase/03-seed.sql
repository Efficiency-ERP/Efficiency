-- ============================================
-- 03 SEED DATA — Run after RLS
-- Inserts demo organizations, contacts, articles
-- Safe to re-run (deletes old seed data first)
-- ============================================

-- ============================================
-- DELETE EXISTING SEED DATA
-- ============================================

delete from issue_lines where issue_id in (select id from issues where organization_id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'));
delete from issues where organization_id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002');
delete from order_lines where order_id in (select id from orders where organization_id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'));
delete from orders where organization_id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002');
delete from delivery_lines where delivery_id in (select id from deliveries where organization_id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'));
delete from deliveries where organization_id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002');
delete from consignment_lines where invoice_id in (select id from invoices where organization_id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'));
delete from invoice_lines where invoice_id in (select id from invoices where organization_id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'));
delete from invoices where organization_id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002');
delete from articles where organization_id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002');
delete from contacts;
delete from logs where organization_id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002');
delete from user_organizations;
delete from profiles;
delete from organizations where id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002');

-- ============================================
-- ORGANIZATIONS
-- ============================================

insert into organizations (id, name, mf, unique_id, address, contact, conditions_de_vente) values
  ('a1000000-0000-0000-0000-000000000001', 'Organisation Interne Tunisie A', null, null,
   '{"line1": "10 Avenue Habib Bourguiba", "city": "Tunis", "zipCode": "1000", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 71 123 456", "fax": null}'::jsonb,
   null),
  ('a1000000-0000-0000-0000-000000000002', 'Organisation Interne Tunisie B', null, null,
   '{"line1": "Rue de Sousse", "city": "Sousse", "zipCode": "4000", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 73 789 012", "fax": null}'::jsonb,
   null);

-- ============================================
-- CONTACTS
-- ============================================

insert into contacts (id, party_type, is_internal_org, internal_organization_id, company_name, mf, unique_id, address, contact, conditions_de_vente) values
  ('c1000000-0000-0000-0000-000000000001', 'customer', false, null, 'Société Carthage', 'MF-TN-1234', 'UID-TN-001',
   '{"line1": "10 Avenue Habib Bourguiba", "city": "Tunis", "zipCode": "1000", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 20 123 456", "fax": null}'::jsonb,
   'Paiement à 30 jours'),
  ('c1000000-0000-0000-0000-000000000002', 'supplier', true, 'a1000000-0000-0000-0000-000000000001', 'Fournisseur Sahel', null, 'UID-TN-002',
   '{"line1": "Rue de Sousse", "city": "Sousse", "zipCode": "4000", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 22 987 654", "fax": "+216 71 234 567"}'::jsonb,
   null),
  ('c1000000-0000-0000-0000-000000000003', 'both', false, null, 'Entreprise Djerba', 'MF-TN-9988', null,
   '{"line1": "Houmt Souk", "city": "Djerba", "zipCode": "4180", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 23 456 789", "fax": null}'::jsonb,
   'Paiement à réception'),
  ('c1000000-0000-0000-0000-000000000004', 'both', true, 'a1000000-0000-0000-0000-000000000001', 'Organisation Interne Tunisie A', null, null,
   '{"line1": "", "city": "", "zipCode": "", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 ", "fax": null}'::jsonb,
   null),
  ('c1000000-0000-0000-0000-000000000005', 'both', true, 'a1000000-0000-0000-0000-000000000002', 'Organisation Interne Tunisie B', null, null,
   '{"line1": "", "city": "", "zipCode": "", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 ", "fax": null}'::jsonb,
   null);

-- ============================================
-- ARTICLES
-- ============================================

insert into articles (id, type, code, designation, organization_id, unit, unit_price_puht, transfer_price, tax_charges, stock, consignment, active) values
  ('d1000000-0000-0000-0000-000000000001', 'product', 'P-BTL-001', 'Eau Minérale 1L', 'a1000000-0000-0000-0000-000000000001', 'pièce', 2.50, 2.20,
   '[{"id":"vat","label":"TVA","rate":19,"base":"ht"},{"id":"dc","label":"DC","rate":1,"base":"ht"}]'::jsonb,
   '{"onHand": 120, "minStock": 50}'::jsonb,
   '{"enabled": true, "packaging": [{"type": "BOUTEILLE", "unitsPerArticle": 12, "depositValue": 1.5}, {"type": "CASIER", "unitsPerArticle": 6, "depositValue": 5}]}'::jsonb,
   true),
  ('d1000000-0000-0000-0000-000000000002', 'service', 'S-CONS-001', 'Consultation technique', 'a1000000-0000-0000-0000-000000000002', null, 150.00, 150.00,
   '[{"id":"vat","label":"TVA","rate":19,"base":"ht"},{"id":"dc","label":"DC","rate":1,"base":"ht"}]'::jsonb,
   '{"onHand": 0, "minStock": 0}'::jsonb,
   '{"enabled": false, "packaging": []}'::jsonb,
   true);
