-- ============================================
-- 20 BON D'ENTRÉE
--
-- The mirror of the bon de sortie: a stock correction that adds, used when
-- a count turns out to be wrong. It has nothing to do with purchases — those
-- come in through the purchase invoice — so the two can never double-count.
--
-- Both live in `issues`, told apart by direction, so they share the lines
-- table, the pages and apply_stock_movements, which already takes its
-- direction from the sign of each line.
-- ============================================

alter table issues
  add column if not exists direction text not null default 'out'
  constraint issues_direction_check check (direction in ('in', 'out'));

-- A correction found at inventory has no counterparty to name, so it is
-- optional — but only on the way in. A bon de sortie still records who
-- the goods went to.
alter table issues alter column counterparty_id drop not null;

alter table issues
  add constraint issues_counterparty_check
  check (direction = 'in' or counterparty_id is not null);
