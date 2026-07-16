-- PocketPlanner — Budget adjustments RPC (Track tab overspend handling)
--
-- HOW TO APPLY: paste into Supabase Dashboard -> SQL Editor -> New query
-- -> Run, AFTER 0001-0006 have already been applied.
--
-- The Track tab's overspend banner offers three one-tap fixes: move money
-- from another category, increase this budget, or leave it. The first two
-- both mutate a budget_lines row AND append a budget_adjustments changelog
-- row — doing that as two separate client round-trips risks a partial
-- write (line updated, changelog entry missing, or vice versa) if the
-- second call fails. This wraps both in one function so it's a single
-- transaction.

create or replace function public.record_budget_adjustment(
  p_type adjustment_type,
  p_budget_line_id uuid,
  p_amount numeric,
  p_from_line_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_adjustment_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'adjustment amount must be positive';
  end if;

  if p_type = 'move' then
    if p_from_line_id is null then
      raise exception 'from_line_id is required for a move adjustment';
    end if;
    update budget_lines set amount_budgeted = greatest(amount_budgeted - p_amount, 0), updated_at = now()
      where id = p_from_line_id and user_id = auth.uid();
    if not found then
      raise exception 'source budget line not found';
    end if;
    update budget_lines set amount_budgeted = amount_budgeted + p_amount, updated_at = now()
      where id = p_budget_line_id and user_id = auth.uid();
    if not found then
      raise exception 'destination budget line not found';
    end if;
  elsif p_type = 'increase' then
    update budget_lines set amount_budgeted = amount_budgeted + p_amount, updated_at = now()
      where id = p_budget_line_id and user_id = auth.uid();
    if not found then
      raise exception 'budget line not found';
    end if;
  elsif p_type = 'decrease' then
    update budget_lines set amount_budgeted = greatest(amount_budgeted - p_amount, 0), updated_at = now()
      where id = p_budget_line_id and user_id = auth.uid();
    if not found then
      raise exception 'budget line not found';
    end if;
  else
    raise exception 'unsupported adjustment type: %', p_type;
  end if;

  insert into budget_adjustments (user_id, budget_line_id, type, amount, from_line_id, note)
  values (auth.uid(), p_budget_line_id, p_type, p_amount, p_from_line_id, p_note)
  returning id into v_adjustment_id;

  return v_adjustment_id;
end;
$$;
grant execute on function public.record_budget_adjustment(adjustment_type, uuid, numeric, uuid, text) to authenticated;
