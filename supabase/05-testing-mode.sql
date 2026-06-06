-- ============================================
-- 5/5 TESTING MODE — Run last (optional)
-- Creates feedback system + storage bucket
-- Enable/disable via NEXT_PUBLIC_TESTING_MODE env var
-- Safe to re-run
-- ============================================

-- ============================================
-- FEEDBACK TABLE
-- ============================================

create table if not exists feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  user_email text,
  type text not null check (type in ('bug', 'feature', 'improvement')),
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz default now()
);

-- ============================================
-- FEEDBACK ATTACHMENTS TABLE
-- ============================================

create table if not exists feedback_attachments (
  id uuid primary key default uuid_generate_v4(),
  feedback_id uuid not null references feedback(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text not null,
  file_size integer,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index if not exists idx_feedback_user on feedback(user_id);
create index if not exists idx_feedback_status on feedback(status);
create index if not exists idx_feedback_created_at on feedback(created_at desc);
create index if not exists idx_feedback_attachments_feedback on feedback_attachments(feedback_id);

-- ============================================
-- STORAGE BUCKET
-- ============================================

insert into storage.buckets (id, name, public)
values ('feedback-attachments', 'feedback-attachments', true)
on conflict (id) do nothing;

-- ============================================
-- DROP EXISTING POLICIES
-- ============================================

-- Storage
drop policy if exists "Anyone can view feedback attachments" on storage.objects;
drop policy if exists "Authenticated users can upload feedback attachments" on storage.objects;
drop policy if exists "Users can delete own feedback attachments" on storage.objects;

-- Tables
drop policy if exists "Anyone can read feedback" on feedback;
drop policy if exists "Authenticated users can create feedback" on feedback;
drop policy if exists "Anyone can update feedback" on feedback;
drop policy if exists "Anyone can read feedback attachments" on feedback_attachments;
drop policy if exists "Authenticated users can create feedback attachments" on feedback_attachments;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table if exists feedback enable row level security;
alter table if exists feedback_attachments enable row level security;

-- ============================================
-- STORAGE POLICIES
-- ============================================

create policy "Anyone can view feedback attachments"
  on storage.objects for select
  using (bucket_id = 'feedback-attachments');

create policy "Authenticated users can upload feedback attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'feedback-attachments');

create policy "Users can delete own feedback attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'feedback-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- TABLE POLICIES
-- ============================================

create policy "Anyone can read feedback"
  on feedback for select
  using (true);

create policy "Authenticated users can create feedback"
  on feedback for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Anonymous users can create feedback"
  on feedback for insert
  to anon
  with check (user_id is null);

create policy "Anyone can update feedback"
  on feedback for update
  using (true);

create policy "Anyone can read feedback attachments"
  on feedback_attachments for select
  using (true);

create policy "Authenticated users can create feedback attachments"
  on feedback_attachments for insert
  to authenticated
  with check (true);
