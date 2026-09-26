-- ============================================
-- 21 ORGANIZATIONS JOIN THEIR TENANT
--
-- "Ajouter une organisation" always created a brand-new tenant: the client
-- stood up a tenant, a membership and then the org, so every company added
-- from the team switcher became its own group, unable to see the others'
-- contacts or trade interco with them. The client now adds the org to the
-- caller's existing tenant; creating a tenant is reserved for a user who has
-- none (first-time onboarding).
--
-- This migration makes adding an organization an admin action, and repairs
-- the one pair of organizations the old behaviour had already split apart.
-- ============================================

-- ---- Adding an organization is an admin action ----
--
-- Until now any member could add one. Which companies make up a group is a
-- structural decision, of a kind with who belongs to it, which the admin role
-- already governs. Onboarding is unaffected: a new user inserts a tenant,
-- bootstraps their own membership as its admin (tenant_member_count = 0),
-- and then inserts the organization as that admin.
drop policy if exists "Users can create organizations" on organizations;

create policy "Tenant admins can create organizations" on organizations
  for insert with check (
    tenant_id in (
      select tenant_id from user_tenants
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ---- Merge "Organisation Interne Tunisie B" into A's tenant ----
--
-- The two are a pair split across two tenants. Only organizations, contacts
-- and user_tenants reference a tenant; documents, articles and stock are
-- scoped by organization and are untouched. Order matters: the contacts
-- trigger requires a contact's internal organization to already be in the
-- contact's tenant, so organizations move before contacts.
--
-- Guarded by name as well as id so that it is a no-op anywhere these seeded
-- tenants do not exist exactly as expected, and on any re-run.
do $$
declare
  v_a constant uuid := 'a1000000-0000-0000-0000-000000000001';
  v_b constant uuid := 'a1000000-0000-0000-0000-000000000002';
begin
  if not exists (select 1 from tenants where id = v_a and name = 'Organisation Interne Tunisie A')
     or not exists (select 1 from tenants where id = v_b and name = 'Organisation Interne Tunisie B') then
    raise notice 'tenant merge skipped: tenants A and B not found as expected';
    return;
  end if;

  update organizations set tenant_id = v_a where tenant_id = v_b;
  update contacts set tenant_id = v_a where tenant_id = v_b;

  insert into user_tenants (user_id, tenant_id, role)
  select ut.user_id, v_a, ut.role
  from user_tenants ut
  where ut.tenant_id = v_b
    and not exists (select 1 from user_tenants x where x.tenant_id = v_a and x.user_id = ut.user_id);

  delete from tenants where id = v_b;

  update tenants set name = 'Organisation Interne Tunisie' where id = v_a;
end;
$$;

-- ---- create_organization: the one way the app creates an organization ----
--
-- The client used to insert with read-back (INSERT … RETURNING), and that has
-- never been able to succeed: RETURNING must pass the table's SELECT policy.
-- A new tenant is readable only by its members, and the membership does not
-- exist yet; a new organization is readable through user_organization_ids(),
-- a STABLE function that runs on the statement's snapshot and so cannot see
-- the row that same statement is inserting. Every organization in the
-- database had been seeded directly.
--
-- This function generates its ids up front, inserts without RETURNING, and
-- reads the rows back in a later statement, which does see them: a volatile
-- plpgsql function takes a fresh snapshot per statement. It is SECURITY
-- INVOKER, so every RLS policy above still decides what the caller may do.
-- And it is one transaction, so a tenant can no longer be left behind
-- without its organization, nor an organization without its internal contact.
--
--   p_tenant_id given → the organization joins that tenant (admins only)
--   p_tenant_id null  → onboarding: a new tenant with the caller as its admin,
--                       allowed only for someone who belongs to no tenant yet
create or replace function public.create_organization(p_tenant_id uuid, p_org jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant uuid := p_tenant_id;
  v_org uuid := gen_random_uuid();
  v_contact uuid := gen_random_uuid();
  v_name text := nullif(btrim(p_org->>'name'), '');
begin
  if v_uid is null then
    raise exception 'create_organization: not signed in' using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'create_organization: a name is required' using errcode = '22023';
  end if;

  if v_tenant is null then
    if exists (select 1 from user_tenants where user_id = v_uid) then
      raise exception 'create_organization: you already belong to a group; add the organization to it'
        using errcode = '42501';
    end if;
    v_tenant := gen_random_uuid();
    insert into tenants (id, name) values (v_tenant, v_name);
    insert into user_tenants (user_id, tenant_id, role) values (v_uid, v_tenant, 'admin');
  end if;

  insert into organizations (id, tenant_id, name, mf, unique_id, address, contact, conditions_de_vente)
  values (
    v_org, v_tenant, v_name,
    nullif(btrim(p_org->>'mf'), ''),
    nullif(btrim(p_org->>'unique_id'), ''),
    coalesce(p_org->'address', '{"line1": "", "city": "", "zipCode": "", "country": "Tunisie"}'::jsonb),
    coalesce(p_org->'contact', '{"phone": "", "fax": null}'::jsonb),
    nullif(btrim(p_org->>'conditions_de_vente'), '')
  );

  -- The organization's own entry in the contacts list, which is what lets the
  -- other organizations of the tenant trade with it (interco).
  insert into contacts (id, party_type, tenant_id, internal_organization_id, company_name, address, contact, archived)
  values (
    v_contact, 'both', v_tenant, v_org, v_name,
    '{"line1": "", "city": "", "zipCode": "", "country": "Tunisie"}'::jsonb,
    '{"phone": "+216 ", "fax": null}'::jsonb,
    false
  );

  return jsonb_build_object(
    'organization', (select to_jsonb(o) from organizations o where o.id = v_org),
    'contact', (select to_jsonb(c) from contacts c where c.id = v_contact)
  );
end;
$$;

revoke execute on function public.create_organization(uuid, jsonb) from public, anon;
grant execute on function public.create_organization(uuid, jsonb) to authenticated;
