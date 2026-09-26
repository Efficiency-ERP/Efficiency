-- ============================================
-- 22 THE ORGANIZATION'S CONTACT ENTRY IS SYSTEM PLUMBING
--
-- Every counterparty is a contact, so each organization has its own entry in
-- the contacts list, tied to it by contacts.internal_organization_id. That is
-- how the app recognises interco: a document is interco when its counterparty
-- is the entry of another organization of the same tenant. It is derived, and
-- shown only as a pill on the document lists — never a marking anyone sets.
--
-- So the link must only ever be what create_organization made it:
--   * exactly one entry per organization
--   * never re-pointed or cleared afterwards
-- ============================================

-- "Fournisseur Sahel" is an external supplier, but hand-written seed data
-- (03-seed.sql) linked it to Organisation Interne Tunisie A, so its documents
-- would have looked like interco. Cleared before the guard below exists.
update contacts
   set internal_organization_id = null
 where id = 'c1000000-0000-0000-0000-000000000002'
   and company_name = 'Fournisseur Sahel'
   and internal_organization_id is not null;

-- Organizations seeded before create_organization existed may lack an entry.
-- Giving each one its entry now means the unique index below leaves no
-- organization that a contact could be hand-linked to.
insert into contacts (party_type, tenant_id, internal_organization_id, company_name, address, contact, archived)
select 'both', o.tenant_id, o.id, o.name,
       '{"line1": "", "city": "", "zipCode": "", "country": "Tunisie"}'::jsonb,
       '{"phone": "+216 ", "fax": null}'::jsonb,
       false
from organizations o
where not exists (select 1 from contacts c where c.internal_organization_id = o.id);

create unique index if not exists contacts_one_entry_per_organization
  on contacts (internal_organization_id)
  where internal_organization_id is not null;

-- The link is set once, when the organization is created. An edit to the
-- contact that re-sends the same value is fine; changing it is not.
create or replace function public.contacts_internal_org_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.internal_organization_id is distinct from old.internal_organization_id then
    raise exception 'an organization''s contact entry cannot be re-linked or unlinked'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists contacts_internal_org_immutable_trigger on contacts;
create trigger contacts_internal_org_immutable_trigger
  before update of internal_organization_id on contacts
  for each row execute function public.contacts_internal_org_immutable();
