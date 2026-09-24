-- ============================================
-- 19 STOCK LEDGER
--
-- Stock only ever moved on a delivery, and only downward. A bon de sortie —
-- the document named for goods leaving — moved nothing; a purchase never
-- moved anything in; a manual correction on the article form rewrote onHand
-- with no trace. The decrement itself was read-then-write per article from
-- the client, so two concurrent documents lost an update, and articles were
-- written before the ledger, so a failure mid-run left stock changed with no
-- movement to explain it.
--
-- The owner's rules, now enforced here:
--   * sale invoice out, purchase invoice in; an avoir reverses its side;
--     a debit note is a price correction and moves nothing
--   * a bon de sortie moves stock out
--   * a delivery note moves nothing
--   * a manual change on the article form is logged as an adjustment
--   * only lines on a 'product' article move stock — a service never does
--
-- Deciding the sign per document stays in the client (invoiceStockSign in
-- src/lib/supabase/stock.ts), next to the document rules it reads; these
-- functions only guarantee that whatever is applied is applied atomically.
-- ============================================

-- A bon de sortie lives in `issues`, not `documents`, so it cannot be
-- referenced through source_document_id's foreign key.
alter table stock_movements
  add column if not exists source_issue_id uuid references issues(id) on delete set null;

-- direction and source_type were unconstrained text; the TypeScript union
-- was the only guard. 'delivery' stays valid for the deploy window, where
-- the previous client may still record one after this migration lands.
alter table stock_movements
  add constraint stock_movements_direction_check
    check (direction in ('in', 'out')),
  add constraint stock_movements_source_type_check
    check (source_type in ('delivery', 'invoice', 'issue', 'adjustment')),
  add constraint stock_movements_sign_check
    check ((direction = 'in' and quantity_delta > 0) or (direction = 'out' and quantity_delta < 0)),
  add constraint stock_movements_single_source_check
    check (source_document_id is null or source_issue_id is null);

-- Applies a document's movements in one transaction: every line or none.
--
-- The balance is changed by a single UPDATE rather than read-then-write,
-- so the row lock serialises concurrent documents and no update is lost.
-- Lines are aggregated per article and visited in article-id order, which
-- gives every caller the same lock order and so cannot deadlock.
--
-- The ledger row takes the article's own organization: stock is tracked
-- per article and articles belong to one organization, so the movement
-- lives where the balance it explains lives.
--
-- SECURITY INVOKER (the default): the caller's RLS applies, so an article
-- outside the caller's organizations matches no row and is skipped.
create or replace function public.apply_stock_movements(
  p_source_type text,
  p_source_document_id uuid,
  p_source_issue_id uuid,
  p_date date,
  p_lines jsonb
) returns setof articles
language plpgsql
set search_path = public
as $$
declare
  r record;
  v_article articles;
begin
  if p_source_type not in ('invoice', 'issue') then
    raise exception 'apply_stock_movements: unsupported source_type %', p_source_type;
  end if;

  -- Every document movement must say which document caused it. Without this
  -- a caller that dropped the id would write movements nothing can explain.
  if p_source_type = 'invoice' and (p_source_document_id is null or p_source_issue_id is not null) then
    raise exception 'apply_stock_movements: an invoice movement needs source_document_id and no source_issue_id';
  end if;
  if p_source_type = 'issue' and (p_source_issue_id is null or p_source_document_id is not null) then
    raise exception 'apply_stock_movements: an issue movement needs source_issue_id and no source_document_id';
  end if;

  for r in
    select (l->>'article_id')::uuid as article_id,
           sum((l->>'quantity_delta')::numeric) as delta
    from jsonb_array_elements(p_lines) l
    where l->>'article_id' is not null
    group by 1
    having sum((l->>'quantity_delta')::numeric) <> 0
    order by 1
  loop
    update articles
       set stock = jsonb_set(
             coalesce(stock, '{"onHand": 0, "minStock": 0}'::jsonb),
             '{onHand}',
             to_jsonb(coalesce((stock->>'onHand')::numeric, 0) + r.delta))
     where id = r.article_id
       and type = 'product'
    returning * into v_article;

    if found then
      insert into stock_movements
        (article_id, organization_id, quantity_delta, direction,
         source_type, source_document_id, source_issue_id, date)
      values
        (v_article.id, v_article.organization_id, r.delta,
         case when r.delta > 0 then 'in' else 'out' end,
         p_source_type, p_source_document_id, p_source_issue_id,
         coalesce(p_date, current_date));
      return next v_article;
    end if;
  end loop;
end;
$$;

-- The article form's stock section. Takes a DELTA rather than a target, so a
-- correction composes with a document that moved stock while the form was
-- open instead of silently undoing it. minStock is set in the same statement
-- so the form never has to write the stock column itself.
create or replace function public.adjust_article_stock(
  p_article_id uuid,
  p_on_hand_delta numeric,
  p_min_stock numeric,
  p_date date default current_date
) returns articles
language plpgsql
set search_path = public
as $$
declare
  v_article articles;
  v_delta numeric := coalesce(p_on_hand_delta, 0);
begin
  update articles
     set stock = coalesce(stock, '{"onHand": 0, "minStock": 0}'::jsonb)
               || jsonb_build_object(
                    'onHand', coalesce((stock->>'onHand')::numeric, 0)
                              + case when type = 'product' then v_delta else 0 end,
                    'minStock', coalesce(p_min_stock, (stock->>'minStock')::numeric, 0))
   where id = p_article_id
  returning * into v_article;

  if not found then
    raise exception 'adjust_article_stock: article % not found or not accessible', p_article_id;
  end if;

  if v_delta <> 0 and v_article.type = 'product' then
    insert into stock_movements
      (article_id, organization_id, quantity_delta, direction, source_type, date)
    values
      (v_article.id, v_article.organization_id, v_delta,
       case when v_delta > 0 then 'in' else 'out' end,
       'adjustment', coalesce(p_date, current_date));
  end if;

  return v_article;
end;
$$;

revoke execute on function public.apply_stock_movements(text, uuid, uuid, date, jsonb) from public, anon;
revoke execute on function public.adjust_article_stock(uuid, numeric, numeric, date) from public, anon;
grant execute on function public.apply_stock_movements(text, uuid, uuid, date, jsonb) to authenticated;
grant execute on function public.adjust_article_stock(uuid, numeric, numeric, date) to authenticated;

-- Opening balances. Every product's current onHand was typed in by hand and
-- has no movement behind it, so the ledger could never reconcile with the
-- balance. One adjustment per such article makes sum(quantity_delta) equal
-- onHand from here on. Guarded by NOT EXISTS so a re-run adds nothing.
insert into stock_movements
  (article_id, organization_id, quantity_delta, direction, source_type, date)
select a.id,
       a.organization_id,
       (a.stock->>'onHand')::numeric,
       case when (a.stock->>'onHand')::numeric > 0 then 'in' else 'out' end,
       'adjustment',
       current_date
from articles a
where a.type = 'product'
  and a.organization_id is not null
  and coalesce((a.stock->>'onHand')::numeric, 0) <> 0
  and not exists (select 1 from stock_movements m where m.article_id = a.id);
