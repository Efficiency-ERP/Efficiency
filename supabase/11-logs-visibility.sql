-- ============================================
-- 11 LOGS VISIBILITY — Run after stock movements
-- The logs feature was writing rows but the "Users can view logs" policy
-- only matched rows with an organization_id in the caller's PMEs, so any
-- log for an action with no single owning PME (contacts, PME creation,
-- profile/settings changes) had organization_id = null and was silently
-- unreadable by everyone, including the user who triggered it.
-- Safe to re-run
-- ============================================

drop policy if exists "Users can view logs" on logs;

create policy "Users can view logs"
  on logs for select
  to authenticated
  using (organization_id is null or organization_id in (select public.user_organization_ids()));
