-- ============================================
-- 16 DEMO SEED DATA — Manual, run whenever needed
-- Random contacts + articles for the demo tenants/orgs created in
-- 11-test-tenants.sql, so the demo logins have something to click through
-- (quotes/invoices/consignments/stock all need contacts and articles to
-- exist first). Safe to re-run (ON CONFLICT DO NOTHING).
--
-- Demo Tenant One (c1000000-...0001) — Alpha + Beta:
--   4 shared external contacts, plus one internal-org contact for each of
--   Alpha and Beta so interco (Alpha <-> Beta) is actually selectable.
--   4 articles each for Alpha (beverages/textile) and Beta (industrial).
-- Demo Tenant Two (c1000000-...0002) — Gamma, alone:
--   2 external contacts, 4 articles (electronics/import).
-- ============================================

-- ============================================
-- CONTACTS — Demo Tenant One (shared across Alpha + Beta)
-- ============================================

insert into contacts (id, tenant_id, party_type, internal_organization_id, company_name, mf, unique_id, address, contact, conditions_de_vente, archived)
values
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'customer', null,
   'Société Tunisienne de Textile', '1234567A', 'RC-TN-00189',
   '{"line1": "12 Avenue Habib Bourguiba", "city": "Tunis", "zipCode": "1001", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 71 234 567", "fax": null}'::jsonb,
   '30 jours fin de mois', false),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'customer', null,
   'Groupe Agro Sahel', '2345678B', 'RC-TN-00276',
   '{"line1": "45 Route de Gabès", "city": "Sfax", "zipCode": "3000", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 74 345 678", "fax": null}'::jsonb,
   'Paiement comptant', false),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'supplier', null,
   'Fournisseur Métal Industries', '3456789C', 'RC-TN-00354',
   '{"line1": "8 Zone Industrielle Sidi Abdelhamid", "city": "Sousse", "zipCode": "4000", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 73 456 789", "fax": null}'::jsonb,
   '60 jours', false),
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', 'supplier', null,
   'Distributeur Électronique Tunis', '4567890D', 'RC-TN-00432',
   '{"line1": "22 Rue de Marseille", "city": "Tunis", "zipCode": "1002", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 71 567 890", "fax": null}'::jsonb,
   '30 jours', false),
  -- Internal-org contacts, one per side, so Alpha <-> Beta interco is selectable
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', 'both', 'a1000000-0000-0000-0000-000000000003',
   'Demo Company Alpha', null, null,
   '{"line1": "", "city": "", "zipCode": "", "country": "Tunisie"}'::jsonb,
   '{"phone": "", "fax": null}'::jsonb, null, false),
  ('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000001', 'both', 'a1000000-0000-0000-0000-000000000004',
   'Demo Company Beta', null, null,
   '{"line1": "", "city": "", "zipCode": "", "country": "Tunisie"}'::jsonb,
   '{"phone": "", "fax": null}'::jsonb, null, false)
on conflict (id) do nothing;

-- ============================================
-- CONTACTS — Demo Tenant Two (Gamma, alone)
-- ============================================

insert into contacts (id, tenant_id, party_type, internal_organization_id, company_name, mf, unique_id, address, contact, conditions_de_vente, archived)
values
  ('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000002', 'customer', null,
   'Client International SARL', '5678901E', 'RC-TN-00511',
   '{"line1": "5 Boulevard du 14 Janvier", "city": "Sousse", "zipCode": "4001", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 73 678 901", "fax": null}'::jsonb,
   '45 jours', false),
  ('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000002', 'supplier', null,
   'Fournisseur Import Sousse', '6789012F', 'RC-TN-00598',
   '{"line1": "17 Rue Ibn Khaldoun", "city": "Sousse", "zipCode": "4002", "country": "Tunisie"}'::jsonb,
   '{"phone": "+216 73 789 012", "fax": null}'::jsonb,
   '30 jours', false)
on conflict (id) do nothing;

-- ============================================
-- ARTICLES — Alpha (beverages / textile)
-- ============================================

insert into articles (id, type, code, designation, organization_id, unit, unit_price_puht, transfer_price, consignment)
values
  ('e1000000-0000-0000-0000-000000000001', 'product', 'ALPHA-EAU-150', 'Eau Minérale 1.5L', 'a1000000-0000-0000-0000-000000000003',
   'carton', 6.500, 5.200,
   '{"enabled": true, "packaging": [{"type": "Casier", "unitsPerArticle": 12, "depositValue": 5.000}]}'::jsonb),
  ('e1000000-0000-0000-0000-000000000002', 'product', 'ALPHA-JUS-100', 'Jus d''Orange 1L', 'a1000000-0000-0000-0000-000000000003',
   'carton', 8.200, 6.600,
   '{"enabled": true, "packaging": [{"type": "Casier", "unitsPerArticle": 12, "depositValue": 5.000}]}'::jsonb),
  ('e1000000-0000-0000-0000-000000000003', 'product', 'ALPHA-TIS-COT', 'Tissu Coton Blanc', 'a1000000-0000-0000-0000-000000000003',
   'mètre', 4.750, 3.900, default),
  ('e1000000-0000-0000-0000-000000000004', 'service', 'ALPHA-SRV-LIV', 'Service de Livraison Express', 'a1000000-0000-0000-0000-000000000003',
   'unité', 25.000, 20.000, default)
on conflict (id) do nothing;

-- ============================================
-- ARTICLES — Beta (industrial / metal parts)
-- ============================================

insert into articles (id, type, code, designation, organization_id, unit, unit_price_puht, transfer_price, consignment)
values
  ('e1000000-0000-0000-0000-000000000005', 'product', 'BETA-TOLE-2MM', 'Tôle Acier 2mm', 'a1000000-0000-0000-0000-000000000004',
   'feuille', 45.000, 37.500, default),
  ('e1000000-0000-0000-0000-000000000006', 'product', 'BETA-VIS-M6', 'Vis Inox M6 (boîte de 100)', 'a1000000-0000-0000-0000-000000000004',
   'boîte', 12.300, 9.800, default),
  ('e1000000-0000-0000-0000-000000000007', 'product', 'BETA-CABLE-25', 'Câble Électrique 2.5mm', 'a1000000-0000-0000-0000-000000000004',
   'rouleau', 33.900, 27.000, default),
  ('e1000000-0000-0000-0000-000000000008', 'service', 'BETA-SRV-MAINT', 'Maintenance Industrielle', 'a1000000-0000-0000-0000-000000000004',
   'heure', 60.000, 48.000, default)
on conflict (id) do nothing;

-- ============================================
-- ARTICLES — Gamma (electronics / import)
-- ============================================

insert into articles (id, type, code, designation, organization_id, unit, unit_price_puht, transfer_price, consignment)
values
  ('e1000000-0000-0000-0000-000000000009', 'product', 'GAMMA-PHONE-65', 'Smartphone Écran 6.5"', 'a1000000-0000-0000-0000-000000000005',
   'unité', 350.000, 290.000, default),
  ('e1000000-0000-0000-0000-000000000010', 'product', 'GAMMA-CHRG-USBC', 'Chargeur USB-C 20W', 'a1000000-0000-0000-0000-000000000005',
   'unité', 15.500, 11.000, default),
  ('e1000000-0000-0000-0000-000000000011', 'product', 'GAMMA-CASQ-BT', 'Casque Bluetooth', 'a1000000-0000-0000-0000-000000000005',
   'unité', 45.000, 35.000, default),
  ('e1000000-0000-0000-0000-000000000012', 'service', 'GAMMA-SRV-TECH', 'Support Technique', 'a1000000-0000-0000-0000-000000000005',
   'heure', 40.000, 32.000, default)
on conflict (id) do nothing;
