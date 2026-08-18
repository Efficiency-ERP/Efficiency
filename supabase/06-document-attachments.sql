-- ============================================
-- 06 DOCUMENT ATTACHMENTS — Run after 01-05
-- Pre/post-invoice files on Invoices and Orders
-- (Trello card #2), private bucket + signed URLs.
-- Safe to re-run
-- ============================================

-- ============================================
-- TABLE
-- ============================================

create table if not exists document_attachments (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  document_type text not null check (document_type in ('invoice', 'order')),
  document_id uuid not null,
  kind text not null check (kind in ('pre_invoice', 'post_invoice')),
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_document_attachments_document on document_attachments(document_type, document_id);

-- ============================================
-- STORAGE BUCKET (private — no public read, unlike feedback-attachments)
-- ============================================

insert into storage.buckets (id, name, public)
values ('document-attachments', 'document-attachments', false)
on conflict (id) do nothing;

-- ============================================
-- DROP EXISTING POLICIES
-- ============================================

drop policy if exists "Org members can read their document attachments" on storage.objects;
drop policy if exists "Org members can upload document attachments" on storage.objects;
drop policy if exists "Org members can delete document attachments" on storage.objects;

drop policy if exists "Users can view document attachments" on document_attachments;
drop policy if exists "Users can create document attachments" on document_attachments;
drop policy if exists "Users can delete document attachments" on document_attachments;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table if exists document_attachments enable row level security;

-- Storage objects are keyed "${organizationId}/${documentType}/${documentId}/...",
-- so the org is the first path segment — same prefix-scoping idea as
-- feedback-attachments' "${userId}/..." convention, keyed by org instead of
-- user since access here follows organization_id like every other table.
create policy "Org members can read their document attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'document-attachments'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  );

create policy "Org members can upload document attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'document-attachments'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  );

create policy "Org members can delete document attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'document-attachments'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  );

create policy "Users can view document attachments"
  on document_attachments for select
  to authenticated
  using (organization_id in (select public.user_organization_ids()));

create policy "Users can create document attachments"
  on document_attachments for insert
  to authenticated
  with check (organization_id in (select public.user_organization_ids()));

create policy "Users can delete document attachments"
  on document_attachments for delete
  to authenticated
  using (organization_id in (select public.user_organization_ids()));
