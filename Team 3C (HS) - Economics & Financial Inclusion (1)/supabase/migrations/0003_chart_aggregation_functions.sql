-- Aggregation RPCs backing the 5 Charts page cards. All `security invoker`
-- (run as the calling user, RLS still applies) and additionally filter by
-- auth.uid() explicitly as defense-in-depth. All read-only ("stable").

-- ------------------------------------------------------------
-- 1. Spending by Category (donut)
-- ------------------------------------------------------------
create or replace function public.get_category_spend(p_start date, p_end date, p_account_id uuid default null)
returns table (category_id uuid, name text, icon text, swatch text, total numeric, pct numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with spend as (
    select t.category_id, sum(-t.amount) as total
    from transactions t
    where t.user_id = auth.uid()
      and t.deleted_at is null
      and t.amount < 0
      and t.tx_date between p_start and p_end
      and (p_account_id is null or t.account_id = p_account_id)
    group by t.category_id
  ),
  total_spend as (
    select coalesce(sum(total), 0) as grand_total from spend
  )
  select
    c.id as category_id,
    coalesce(c.name, 'Uncategorized') as name,
    coalesce(c.icon, 'circle') as icon,
    coalesce(c.swatch, 'muted') as swatch,
    s.total,
    case when ts.grand_total > 0 then round((s.total / ts.grand_total) * 100, 1) else 0 end as pct
  from spend s
  left join categories c on c.id = s.category_id
  cross join total_spend ts
  order by s.total desc;
$$;
grant execute on function public.get_category_spend(date, date, uuid) to authenticated;

-- ------------------------------------------------------------
-- 2. Cash Flow (bar + net line), monthly buckets
-- ------------------------------------------------------------
create or replace function public.get_cash_flow(p_start date, p_end date, p_granularity text default 'month')
returns table (period_start date, income numeric, expense numeric, net numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    date_trunc('month', t.tx_date)::date as period_start,
    coalesce(sum(case when t.amount > 0 then t.amount else 0 end), 0) as income,
    coalesce(sum(case when t.amount < 0 then -t.amount else 0 end), 0) as expense,
    coalesce(sum(t.amount), 0) as net
  from transactions t
  where t.user_id = auth.uid()
    and t.deleted_at is null
    and t.tx_date between p_start and p_end
  group by 1
  order by 1;
$$;
grant execute on function public.get_cash_flow(date, date, text) to authenticated;

-- ------------------------------------------------------------
-- 3. Spending Trend (cumulative daily spend vs. prorated budget pace)
-- ------------------------------------------------------------
create or replace function public.get_spending_trend(p_start date, p_end date)
returns table (day date, cumulative_spend numeric, budget_pace numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with days as (
    select generate_series(p_start, p_end, interval '1 day')::date as day
  ),
  daily_spend as (
    select t.tx_date as day, sum(-t.amount) as spend
    from transactions t
    where t.user_id = auth.uid()
      and t.deleted_at is null
      and t.amount < 0
      and t.tx_date between p_start and p_end
    group by t.tx_date
  ),
  total_budget as (
    select coalesce(sum(monthly_limit), 0) as monthly_total
    from budgets where user_id = auth.uid()
  )
  select
    d.day,
    sum(coalesce(ds.spend, 0)) over (order by d.day) as cumulative_spend,
    round(tb.monthly_total * (extract(day from d.day) / extract(day from (date_trunc('month', d.day) + interval '1 month - 1 day'))), 2) as budget_pace
  from days d
  left join daily_spend ds on ds.day = d.day
  cross join total_budget tb
  order by d.day;
$$;
grant execute on function public.get_spending_trend(date, date) to authenticated;

-- ------------------------------------------------------------
-- 4. Budget vs Actual (per-category progress for one month)
-- ------------------------------------------------------------
create or replace function public.get_budget_vs_actual(p_month date)
returns table (category_id uuid, name text, icon text, swatch text, budget_limit numeric, actual numeric, pct_used numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with month_range as (
    select date_trunc('month', p_month)::date as start_date,
           (date_trunc('month', p_month) + interval '1 month - 1 day')::date as end_date
  ),
  actuals as (
    select t.category_id, sum(-t.amount) as actual
    from transactions t, month_range m
    where t.user_id = auth.uid()
      and t.deleted_at is null
      and t.amount < 0
      and t.tx_date between m.start_date and m.end_date
    group by t.category_id
  )
  select
    b.category_id,
    c.name,
    c.icon,
    c.swatch,
    b.monthly_limit as budget_limit,
    coalesce(a.actual, 0) as actual,
    case when b.monthly_limit > 0 then round((coalesce(a.actual, 0) / b.monthly_limit) * 100, 1) else 0 end as pct_used
  from budgets b
  join categories c on c.id = b.category_id
  left join actuals a on a.category_id = b.category_id
  where b.user_id = auth.uid()
  order by pct_used desc;
$$;
grant execute on function public.get_budget_vs_actual(date) to authenticated;

-- ------------------------------------------------------------
-- 5. Top Merchants (ranked list)
-- ------------------------------------------------------------
create or replace function public.get_top_merchants(p_start date, p_end date, p_limit int default 10)
returns table (merchant_normalized text, category_id uuid, category_name text, total numeric, tx_count int, last_date date)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(t.merchant_normalized, t.description) as merchant_normalized,
    t.category_id,
    c.name as category_name,
    sum(-t.amount) as total,
    count(*)::int as tx_count,
    max(t.tx_date) as last_date
  from transactions t
  left join categories c on c.id = t.category_id
  where t.user_id = auth.uid()
    and t.deleted_at is null
    and t.amount < 0
    and t.tx_date between p_start and p_end
  group by 1, t.category_id, c.name
  order by total desc
  limit p_limit;
$$;
grant execute on function public.get_top_merchants(date, date, int) to authenticated;
