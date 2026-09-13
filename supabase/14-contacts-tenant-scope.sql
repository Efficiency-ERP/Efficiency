-- ============================================
-- 14 CONTACTS TENANT SCOPE
--
-- contacts had no organization/tenant column at all. RLS branched on the
-- client-settable is_internal_org flag: "is_internal_org = false" (i.e.
-- every ordinary customer/supplier contact) collapsed the policy to
-- `true`, so any authenticated user on any tenant could read, insert, and
-- update every other tenant's contacts. Fix: give contacts a real
-- tenant_id and scope all three policies by tenant membership. Also stop
-- trusting is_internal_org as free client input — it's now derived purely
-- from internal_organization_id, and a trigger guarantees that FK always
-- points at an org in the contact's own tenant.
-- ============================================

alter table contacts add column if not exists tenant_id uuid references tenants(id);

-- Backfill in three passes, most-specific signal first:
-- 1) internal-org contacts inherit their linked org's tenant.
update contacts c
set tenant_id = o.tenant_id
from organizations o
where c.internal_organization_id = o.id
  and c.tenant_id is null;

-- 2) external contacts inherit the tenant of an org that has actually
--    transacted with them (via documents.counterparty_id).
update contacts c
set tenant_id = sub.tenant_id
from (
  select distinct on (d.counterparty_id) d.counterparty_id, o.tenant_id
  from documents d
  join organizations o on o.id = d.organization_id
  order by d.counterparty_id, d.created_at
) sub
where sub.counterparty_id = c.id
  and c.tenant_id is null;

-- 3) anything left (no internal org, no transacting document) is a
--    pre-tenancy demo row with no real signal left — assign it to the
--    oldest tenant so it isn't orphaned.
update contacts c
set tenant_id = (select id from tenants order by created_at limit 1)
where c.tenant_id is null;

alter table contacts alter column tenant_id set not null;
create index if not exists idx_contacts_tenant on contacts(tenant_id);

-- RLS: replace the is_internal_org-branching policies with plain tenant
-- scoping first, since they reference is_internal_org and block dropping it.
drop policy if exists "Users can view contacts" on contacts;
drop policy if exists "Users can create contacts" on contacts;
drop policy if exists "Users can update contacts" on contacts;

-- is_internal_org stops being an independently-settable column.
alter table contacts drop column if exists is_internal_org;
alter table contacts add column is_internal_org boolean generated always as (internal_organization_id is not null) stored;

-- Guarantees internal_organization_id can never point outside the
-- contact's own tenant (previously nothing enforced this at all).
create or replace function public.contacts_internal_org_tenant_check()
returns trigger as $$
begin
  if new.internal_organization_id is not null then
    if not exists (
      select 1 from organizations o
      where o.id = new.internal_organization_id
        and o.tenant_id = new.tenant_id
    ) then
      raise exception 'internal_organization_id must belong to the contact''s own tenant';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists contacts_internal_org_tenant_trigger on contacts;
create trigger contacts_internal_org_tenant_trigger
  before insert or update on contacts
  for each row execute function public.contacts_internal_org_tenant_check();

create policy "Users can view contacts"
  on contacts for select
  to authenticated
  using (tenant_id in (select tenant_id from user_tenants where user_id = auth.uid()));

create policy "Users can create contacts"
  on contacts for insert
  to authenticated
  with check (tenant_id in (select tenant_id from user_tenants where user_id = auth.uid()));

create policy "Users can update contacts"
  on contacts for update
  to authenticated
  using (tenant_id in (select tenant_id from user_tenants where user_id = auth.uid()))
  with check (tenant_id in (select tenant_id from user_tenants where user_id = auth.uid()));
