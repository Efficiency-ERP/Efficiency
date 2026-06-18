-- ============================================
-- 6/6 FEEDBACK NOTES — Run after testing mode
-- Adds admin notes attached to each feedback
-- Safe to re-run
-- ============================================

-- ============================================
-- FEEDBACK NOTES TABLE
-- ============================================

create table if not exists feedback_notes (
  id uuid primary key default uuid_generate_v4(),
  feedback_id uuid not null references feedback(id) on delete cascade,
  author text,
  body text not null,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index if not exists idx_feedback_notes_feedback on feedback_notes(feedback_id);
create index if not exists idx_feedback_notes_created_at on feedback_notes(created_at desc);

-- ============================================
-- DROP EXISTING POLICIES
-- ============================================

drop policy if exists "Anyone can read feedback notes" on feedback_notes;
drop policy if exists "Anyone can create feedback notes" on feedback_notes;
drop policy if exists "Anyone can update feedback notes" on feedback_notes;
drop policy if exists "Anyone can delete feedback notes" on feedback_notes;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table if exists feedback_notes enable row level security;

create policy "Anyone can read feedback notes"
  on feedback_notes for select
  using (true);

create policy "Anyone can create feedback notes"
  on feedback_notes for insert
  with check (true);

create policy "Anyone can update feedback notes"
  on feedback_notes for update
  using (true);

create policy "Anyone can delete feedback notes"
  on feedback_notes for delete
  using (true);
