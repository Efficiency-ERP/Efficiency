-- Testing Mode: Feedback System
-- Run this in your Supabase SQL Editor

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

-- Create the storage bucket for feedback attachments
insert into storage.buckets (id, name, public)
values ('feedback-attachments', 'feedback-attachments', true)
on conflict (id) do nothing;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Allow authenticated users to upload files
create policy "Authenticated users can upload feedback attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'feedback-attachments'
  );

-- Allow anyone to view feedback attachments (public bucket)
create policy "Public can view feedback attachments"
  on storage.objects for select
  to public
  using (
    bucket_id = 'feedback-attachments'
  );

-- Allow users to delete their own uploads
create policy "Users can delete own feedback attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'feedback-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table feedback enable row level security;
alter table feedback_attachments enable row level security;

-- Users can view all feedback (for transparency)
create policy "Users can view all feedback"
  on feedback for select
  to authenticated
  using (true);

-- Users can create their own feedback
create policy "Users can create own feedback"
  on feedback for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can view all feedback attachments
create policy "Users can view feedback attachments"
  on feedback_attachments for select
  to authenticated
  using (true);

-- Users can create feedback attachments
create policy "Users can create feedback attachments"
  on feedback_attachments for insert
  to authenticated
  with check (true);
