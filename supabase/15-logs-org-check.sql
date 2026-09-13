-- ============================================
-- 15 LOGS ORG CHECK
--
-- logs.organization_id already gates SELECT ("organization_id is null or
-- organization_id in own orgs"), but INSERT was `with check (true)` — any
-- authenticated user could write a log row stamped with any organization_id,
-- including another tenant's, and it would then show up in that tenant's
-- activity feed as a forged entry. Mirror the SELECT check onto INSERT.
-- ============================================

drop policy if exists "Users can create logs" on logs;

create policy "Users can create logs"
  on logs for insert
  to authenticated
  with check (organization_id is null or organization_id in (select public.user_organization_ids()));
