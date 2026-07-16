-- PocketPlanner — per-category monthly spend history (Plan tab sparklines)
--
-- HOW TO APPLY: paste into Supabase Dashboard -> SQL Editor -> New query
-- -> Run, AFTER 0001-0007 have already been applied.

create or replace function public.category_spend_history(p_category_id uuid, p_months int default 6)
returns table (month date, total numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with months as (
    select date_trunc('month', current_date - (n || ' months')::interval)::date as month
    from generate_series(p_months - 1, 0, -1) as n
  ),
  spend as (
    select date_trunc('month', t.tx_date)::date as month, sum(-t.amount) as total
    from transactions t
    where t.user_id = auth.uid()
      and t.deleted_at is null
      and t.amount < 0
      and t.category_id = p_category_id
      and t.tx_date >= (select min(month) from months)
    group by 1
  )
  select m.month, coalesce(s.total, 0) as total
  from months m
  left join spend s on s.month = m.month
  order by m.month;
$$;
grant execute on function public.category_spend_history(uuid, int) to authenticated;
