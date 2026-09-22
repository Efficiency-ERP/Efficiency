-- ============================================
-- 17 ORGANIZATION IDENTITY
--
-- A printed invoice has to identify who issued it. Name, MF, address and
-- phone were already stored, but two things a Tunisian invoice normally
-- carries were not: the company's logo, and the bank details a customer
-- needs in order to pay by virement (a listed payment method with nowhere
-- to put the RIB).
--
-- Both are additive and nullable — existing organizations keep working and
-- simply print without a logo or bank block.
-- ============================================

alter table organizations add column if not exists logo_path text;
alter table organizations add column if not exists bank_details jsonb;

-- ============================================
-- LOGO STORAGE (private, same shape as document-attachments)
-- ============================================

insert into storage.buckets (id, name, public)
values ('organization-logos', 'organization-logos', false)
on conflict (id) do nothing;

drop policy if exists "Org members can read their logo" on storage.objects;
drop policy if exists "Org members can upload their logo" on storage.objects;
drop policy if exists "Org members can replace their logo" on storage.objects;
drop policy if exists "Org members can delete their logo" on storage.objects;

-- Objects are keyed "${organizationId}/...", so the org is the first path
-- segment — the convention 06-document-attachments.sql already established.
create policy "Org members can read their logo"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'organization-logos'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  );

create policy "Org members can upload their logo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'organization-logos'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  );

create policy "Org members can replace their logo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'organization-logos'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  )
  with check (
    bucket_id = 'organization-logos'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  );

create policy "Org members can delete their logo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'organization-logos'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  );
