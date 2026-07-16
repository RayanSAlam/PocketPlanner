-- PocketPlanner — Budgeting feature schema (Plan / Track / Goals)
--
-- HOW TO APPLY: paste this whole file into Supabase Dashboard -> SQL Editor
-- -> New query -> Run, AFTER 0001-0005 have already been applied. No CLI
-- needed, same as every prior migration in this project.
--
-- This migration retires the old flat `budgets` table (one row per
-- user+category with a single monthly_limit — no period, no method) and
-- replaces it with a period-based model (a `budgets` header row per
-- user+month, `budget_lines` per category within that period) that can
-- support methods, draft/active status, rollover, and sinking funds. Any
-- existing rows in the old table are migrated into a "current month"
-- budget first, so no data is lost — see the DO block below.
--
-- OPTIONAL step at the very bottom (commented out): scheduling the monthly
-- rollover job requires enabling the pg_cron extension first (Dashboard ->
-- Database -> Extensions -> search "pg_cron" -> Enable). Skip it if you're
-- not ready — budgets can still be advanced manually via "Copy last month"
-- in the UI.

-- ============================================================
-- Enums
-- ============================================================
create type budget_method as enum ('fifty_thirty_twenty', 'zero_based', 'envelope', 'custom');
create type budget_status as enum ('draft', 'active');
create type adjustment_type as enum ('move', 'increase', 'decrease');
create type goal_type as enum ('save', 'paydown');
create type goal_status as enum ('active', 'completed', 'archived');
create type contribution_source as enum ('manual', 'auto');

-- ============================================================
-- budgets — rename the old flat table out of the way, then recreate as a
-- period header. Renaming (not dropping) so the migration DO block further
-- down can still read old rows before they're discarded.
-- ============================================================
alter table if exists budgets rename to budgets_old;

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period date not null,
  method budget_method not null default 'custom',
  income_expected numeric(12,2) not null default 0,
  status budget_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period)
);

alter table budgets enable row level security;
create policy "budgets_select_own" on budgets for select using (user_id = auth.uid());
create policy "budgets_insert_own" on budgets for insert with check (user_id = auth.uid());
create policy "budgets_update_own" on budgets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budgets_delete_own" on budgets for delete using (user_id = auth.uid());

-- ============================================================
-- budget_lines — one row per category within a budget period.
-- group_name is freeform text (not its own table): "renaming a group" is
-- just a bulk string update across the lines that share it.
-- ============================================================
create table budget_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id uuid not null references budgets(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  group_name text not null default 'Needs',
  amount_budgeted numeric(12,2) not null default 0,
  rollover_enabled boolean not null default false,
  sinking_fund_target_annual numeric(12,2),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (budget_id, category_id)
);

alter table budget_lines enable row level security;
create policy "budget_lines_select_own" on budget_lines for select using (user_id = auth.uid());
create policy "budget_lines_insert_own" on budget_lines for insert with check (user_id = auth.uid());
create policy "budget_lines_update_own" on budget_lines for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budget_lines_delete_own" on budget_lines for delete using (user_id = auth.uid());

create index budget_lines_budget_idx on budget_lines (budget_id, sort_order);

-- Same class of gap the 0001 transactions trigger closes: RLS alone only
-- proves user_id = auth.uid() on the row itself, not that budget_id /
-- category_id actually belong to that same user.
create or replace function public.enforce_budget_line_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from budgets b where b.id = new.budget_id and b.user_id = new.user_id) then
    raise exception 'budget does not belong to user';
  end if;
  if not exists (
    select 1 from categories c where c.id = new.category_id and (c.user_id is null or c.user_id = new.user_id)
  ) then
    raise exception 'category not accessible to user';
  end if;
  return new;
end;
$$;

create trigger budget_lines_enforce_ownership
  before insert or update on budget_lines
  for each row execute function public.enforce_budget_line_ownership();

-- ============================================================
-- Migrate any existing (user_id, category_id) -> monthly_limit rows into a
-- single "current month" budget per user, then retire the old table and
-- the RPC that read it (its columns no longer exist on the new `budgets`
-- shape, so it would only ever error from here on).
-- ============================================================
do $$
declare
  v_user_id uuid;
  v_budget_id uuid;
  v_current_period date := date_trunc('month', current_date)::date;
begin
  if to_regclass('public.budgets_old') is not null then
    for v_user_id in select distinct user_id from budgets_old loop
      insert into budgets (user_id, period, method, income_expected, status)
      values (v_user_id, v_current_period, 'custom', 0, 'active')
      on conflict (user_id, period) do update set status = 'active'
      returning id into v_budget_id;

      insert into budget_lines (user_id, budget_id, category_id, group_name, amount_budgeted, sort_order)
      select v_user_id, v_budget_id, bo.category_id, 'Needs', bo.monthly_limit, row_number() over (order by bo.created_at)
      from budgets_old bo
      where bo.user_id = v_user_id
      on conflict (budget_id, category_id) do nothing;
    end loop;
  end if;
end $$;

drop function if exists public.get_budget_vs_actual(date);
drop table if exists budgets_old;

-- get_spending_trend (0003) also read the old flat budgets.monthly_limit
-- for its "budget pace" line — repointed here at the new per-category
-- budget_lines for the range's month, summed, same as before (this
-- function has always assumed p_start/p_end fall within a single month;
-- preserved rather than changed).
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
    select coalesce(sum(bl.amount_budgeted), 0) as monthly_total
    from budget_lines bl
    join budgets b on b.id = bl.budget_id
    where b.user_id = auth.uid() and b.period = date_trunc('month', p_start)::date
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

-- ============================================================
-- budget_adjustments — append-only changelog (move/increase/decrease),
-- surfaced in the Track tab so users can see their own past decisions.
-- ============================================================
create table budget_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_line_id uuid not null references budget_lines(id) on delete cascade,
  type adjustment_type not null,
  amount numeric(12,2) not null,
  from_line_id uuid references budget_lines(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table budget_adjustments enable row level security;
create policy "budget_adjustments_select_own" on budget_adjustments for select using (user_id = auth.uid());
create policy "budget_adjustments_insert_own" on budget_adjustments for insert with check (user_id = auth.uid());
create policy "budget_adjustments_delete_own" on budget_adjustments for delete using (user_id = auth.uid());

create index budget_adjustments_line_idx on budget_adjustments (budget_line_id, created_at desc);

create or replace function public.enforce_budget_adjustment_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from budget_lines bl where bl.id = new.budget_line_id and bl.user_id = new.user_id) then
    raise exception 'budget line does not belong to user';
  end if;
  if new.from_line_id is not null and not exists (
    select 1 from budget_lines bl where bl.id = new.from_line_id and bl.user_id = new.user_id
  ) then
    raise exception 'source budget line does not belong to user';
  end if;
  return new;
end;
$$;

create trigger budget_adjustments_enforce_ownership
  before insert on budget_adjustments
  for each row execute function public.enforce_budget_adjustment_ownership();

-- ============================================================
-- goals — save-up or pay-down targets, optionally linked to a budget
-- category (so contributions can be budgeted automatically) or an account
-- (so transfers into it can be auto-detected as contributions).
-- ============================================================
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'Target',
  type goal_type not null default 'save',
  target_amount numeric(12,2) not null,
  starting_amount numeric(12,2) not null default 0,
  target_date date,
  linked_category_id uuid references categories(id) on delete set null,
  linked_account_id uuid references accounts(id) on delete set null,
  status goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table goals enable row level security;
create policy "goals_select_own" on goals for select using (user_id = auth.uid());
create policy "goals_insert_own" on goals for insert with check (user_id = auth.uid());
create policy "goals_update_own" on goals for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goals_delete_own" on goals for delete using (user_id = auth.uid());

create or replace function public.enforce_goal_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.linked_category_id is not null and not exists (
    select 1 from categories c where c.id = new.linked_category_id and (c.user_id is null or c.user_id = new.user_id)
  ) then
    raise exception 'category not accessible to user';
  end if;
  if new.linked_account_id is not null and not exists (
    select 1 from accounts a where a.id = new.linked_account_id and a.user_id = new.user_id
  ) then
    raise exception 'account does not belong to user';
  end if;
  return new;
end;
$$;

create trigger goals_enforce_ownership
  before insert or update on goals
  for each row execute function public.enforce_goal_ownership();

-- ============================================================
-- goal_contributions — manual entries or auto-detected transfers.
-- ============================================================
create table goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references goals(id) on delete cascade,
  amount numeric(12,2) not null,
  date date not null default current_date,
  transaction_id uuid references transactions(id) on delete set null,
  source contribution_source not null default 'manual',
  created_at timestamptz not null default now()
);

alter table goal_contributions enable row level security;
create policy "goal_contributions_select_own" on goal_contributions for select using (user_id = auth.uid());
create policy "goal_contributions_insert_own" on goal_contributions for insert with check (user_id = auth.uid());
create policy "goal_contributions_delete_own" on goal_contributions for delete using (user_id = auth.uid());

create index goal_contributions_goal_idx on goal_contributions (goal_id, date desc);

create or replace function public.enforce_goal_contribution_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from goals g where g.id = new.goal_id and g.user_id = new.user_id) then
    raise exception 'goal does not belong to user';
  end if;
  if new.transaction_id is not null and not exists (
    select 1 from transactions t where t.id = new.transaction_id and t.user_id = new.user_id
  ) then
    raise exception 'transaction does not belong to user';
  end if;
  return new;
end;
$$;

create trigger goal_contributions_enforce_ownership
  before insert on goal_contributions
  for each row execute function public.enforce_goal_contribution_ownership();

-- ============================================================
-- notification_settings — one row per user, per-alert-type toggles.
-- ============================================================
create table notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_alerts_enabled boolean not null default true,
  threshold_80_enabled boolean not null default true,
  threshold_100_enabled boolean not null default true,
  weekly_summary_enabled boolean not null default true,
  unusual_transaction_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table notification_settings enable row level security;
create policy "notification_settings_select_own" on notification_settings for select using (user_id = auth.uid());
create policy "notification_settings_insert_own" on notification_settings for insert with check (user_id = auth.uid());
create policy "notification_settings_update_own" on notification_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- budget_insights — cached AI-generated (or heuristic-generated) insights,
-- one row per user per period, overwritten on regeneration.
-- ============================================================
create table budget_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period date not null,
  insights jsonb not null,
  generated_at timestamptz not null default now(),
  unique (user_id, period)
);

alter table budget_insights enable row level security;
create policy "budget_insights_select_own" on budget_insights for select using (user_id = auth.uid());
create policy "budget_insights_insert_own" on budget_insights for insert with check (user_id = auth.uid());
create policy "budget_insights_update_own" on budget_insights for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budget_insights_delete_own" on budget_insights for delete using (user_id = auth.uid());

-- ============================================================
-- budget_progress: the core Track-tab query. Per-line budgeted/spent/
-- remaining/pct-used for one period, plus rollover-in computed live from
-- the PRIOR period's (budgeted - spent) for that category (only when
-- rollover_enabled) rather than a persisted running balance — always
-- accurate, never drifts.
-- ============================================================
create or replace function public.budget_progress(p_period date)
returns table (
  line_id uuid,
  category_id uuid,
  category_name text,
  category_icon text,
  category_swatch text,
  group_name text,
  sort_order int,
  amount_budgeted numeric,
  spent numeric,
  remaining numeric,
  pct_used numeric,
  rollover_enabled boolean,
  rollover_in numeric,
  sinking_fund_target_annual numeric,
  last_month_spent numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with period_start as (
    select date_trunc('month', p_period)::date as d
  ),
  this_range as (
    select d as start_date, (d + interval '1 month - 1 day')::date as end_date from period_start
  ),
  prev_range as (
    select (d - interval '1 month')::date as start_date, (d - interval '1 day')::date as end_date from period_start
  ),
  this_budget as (
    select b.id from budgets b, period_start p where b.user_id = auth.uid() and b.period = p.d
  ),
  prev_budget as (
    select b.id from budgets b, period_start p where b.user_id = auth.uid() and b.period = (p.d - interval '1 month')::date
  ),
  actuals as (
    select t.category_id, sum(-t.amount) as spent
    from transactions t, this_range r
    where t.user_id = auth.uid() and t.deleted_at is null and t.amount < 0
      and t.tx_date between r.start_date and r.end_date
    group by t.category_id
  ),
  prev_actuals as (
    select t.category_id, sum(-t.amount) as spent
    from transactions t, prev_range r
    where t.user_id = auth.uid() and t.deleted_at is null and t.amount < 0
      and t.tx_date between r.start_date and r.end_date
    group by t.category_id
  ),
  prev_line_remaining as (
    select
      pbl.category_id,
      pbl.rollover_enabled,
      pbl.amount_budgeted - coalesce(pa.spent, 0) as remaining
    from budget_lines pbl
    join prev_budget pb on pb.id = pbl.budget_id
    left join prev_actuals pa on pa.category_id = pbl.category_id
  )
  select
    bl.id as line_id,
    bl.category_id,
    c.name as category_name,
    c.icon as category_icon,
    c.swatch as category_swatch,
    bl.group_name,
    bl.sort_order,
    bl.amount_budgeted,
    coalesce(a.spent, 0) as spent,
    bl.amount_budgeted - coalesce(a.spent, 0) as remaining,
    case when bl.amount_budgeted > 0 then round((coalesce(a.spent, 0) / bl.amount_budgeted) * 100, 1) else 0 end as pct_used,
    bl.rollover_enabled,
    coalesce(case when bl.rollover_enabled then plr.remaining else 0 end, 0) as rollover_in,
    bl.sinking_fund_target_annual,
    coalesce(pa2.spent, 0) as last_month_spent
  from budget_lines bl
  join this_budget tb on tb.id = bl.budget_id
  join categories c on c.id = bl.category_id
  left join actuals a on a.category_id = bl.category_id
  left join prev_line_remaining plr on plr.category_id = bl.category_id
  left join prev_actuals pa2 on pa2.category_id = bl.category_id
  order by bl.group_name, bl.sort_order;
$$;
grant execute on function public.budget_progress(date) to authenticated;

-- ============================================================
-- sinking_fund_progress: accumulation-to-date this calendar year for a
-- category flagged with an annual target (car insurance, gifts, etc).
-- ============================================================
create or replace function public.sinking_fund_progress(p_category_id uuid)
returns table (target_annual numeric, monthly_target numeric, accumulated numeric, remaining_needed numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with year_start as (
    select date_trunc('year', current_date)::date as d
  ),
  lines as (
    select bl.amount_budgeted, bl.sinking_fund_target_annual, b.period
    from budget_lines bl
    join budgets b on b.id = bl.budget_id
    where bl.user_id = auth.uid()
      and bl.category_id = p_category_id
      and b.period >= (select d from year_start)
      and b.period <= current_date
  ),
  spends as (
    select date_trunc('month', t.tx_date)::date as period, sum(-t.amount) as spent
    from transactions t
    where t.user_id = auth.uid() and t.deleted_at is null and t.amount < 0
      and t.category_id = p_category_id
      and t.tx_date >= (select d from year_start)
    group by 1
  ),
  target as (
    select max(sinking_fund_target_annual) as target_annual from lines
  )
  select
    tg.target_annual,
    round(coalesce(tg.target_annual, 0) / 12, 2) as monthly_target,
    coalesce(sum(l.amount_budgeted - coalesce(s.spent, 0)), 0) as accumulated,
    greatest(coalesce(tg.target_annual, 0) - coalesce(sum(l.amount_budgeted - coalesce(s.spent, 0)), 0), 0) as remaining_needed
  from lines l
  left join spends s on s.period = l.period
  cross join target tg
  group by tg.target_annual;
$$;
grant execute on function public.sinking_fund_progress(uuid) to authenticated;

-- ============================================================
-- materialize_next_period: copies budget_lines from one period into the
-- next (creating the next budgets row if needed), used by both the
-- client's "Copy last month" button and, separately below, the scheduled
-- rollover job.
-- ============================================================
create or replace function public.materialize_next_period(p_from_period date)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_from_budget_id uuid;
  v_to_period date;
  v_to_budget_id uuid;
begin
  v_to_period := (date_trunc('month', p_from_period) + interval '1 month')::date;

  select id into v_from_budget_id from budgets where user_id = auth.uid() and period = date_trunc('month', p_from_period)::date;
  if v_from_budget_id is null then
    raise exception 'no budget found for source period %', p_from_period;
  end if;

  select id into v_to_budget_id from budgets where user_id = auth.uid() and period = v_to_period;
  if v_to_budget_id is null then
    insert into budgets (user_id, period, method, income_expected, status)
    select user_id, v_to_period, method, income_expected, 'draft'
    from budgets where id = v_from_budget_id
    returning id into v_to_budget_id;
  end if;

  insert into budget_lines (user_id, budget_id, category_id, group_name, amount_budgeted, rollover_enabled, sinking_fund_target_annual, sort_order)
  select user_id, v_to_budget_id, category_id, group_name, amount_budgeted, rollover_enabled, sinking_fund_target_annual, sort_order
  from budget_lines
  where budget_id = v_from_budget_id
  on conflict (budget_id, category_id) do nothing;

  return v_to_budget_id;
end;
$$;
grant execute on function public.materialize_next_period(date) to authenticated;

-- ============================================================
-- run_scheduled_month_rollover: the cron entry point. security definer
-- because it has to touch every user's budgets in one pass — there's no
-- single auth.uid() under a cron execution context. Deliberately NOT
-- granted to `authenticated`: this must only ever be invoked by the
-- pg_cron schedule at the bottom of this file, never callable directly
-- by a client (it would let one user materialize budgets for everyone).
-- ============================================================
create or replace function public.run_scheduled_month_rollover()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_from_budget_id uuid;
  v_to_budget_id uuid;
  v_prev_period date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_to_period date := date_trunc('month', current_date)::date;
  v_count int := 0;
begin
  for v_user_id, v_from_budget_id in
    select user_id, id from budgets where period = v_prev_period and status = 'active'
  loop
    select id into v_to_budget_id from budgets where user_id = v_user_id and period = v_to_period;
    if v_to_budget_id is null then
      insert into budgets (user_id, period, method, income_expected, status)
      select user_id, v_to_period, method, income_expected, 'draft'
      from budgets where id = v_from_budget_id
      returning id into v_to_budget_id;
    end if;

    insert into budget_lines (user_id, budget_id, category_id, group_name, amount_budgeted, rollover_enabled, sinking_fund_target_annual, sort_order)
    select user_id, v_to_budget_id, category_id, group_name, amount_budgeted, rollover_enabled, sinking_fund_target_annual, sort_order
    from budget_lines
    where budget_id = v_from_budget_id
    on conflict (budget_id, category_id) do nothing;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ============================================================
-- Realtime: so the grid / progress bars update live when a document
-- import lands in another tab. Guarded so re-running this file is safe
-- even if a table is already published.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table transactions;
  end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'budget_lines'
  ) then
    alter publication supabase_realtime add table budget_lines;
  end if;
end $$;

-- ============================================================
-- Explicit grants (belt-and-suspenders, matches 0001's convention)
-- ============================================================
grant select, insert, update, delete on budgets, budget_lines, budget_adjustments, goals, goal_contributions, notification_settings, budget_insights to authenticated;

-- ============================================================
-- OPTIONAL — scheduled month rollover via pg_cron.
-- Requires the pg_cron extension, which is NOT enabled by default.
-- Enable it once via Supabase Dashboard -> Database -> Extensions ->
-- search "pg_cron" -> Enable, THEN uncomment and run the statement below.
-- Skip this entirely if you're not ready — budgets still advance manually
-- via "Copy last month" in the UI (materialize_next_period above).
-- ============================================================
-- select cron.schedule(
--   'pocketplanner-monthly-budget-rollover',
--   '0 6 1 * *',  -- 06:00 UTC on the 1st of every month
--   $$select public.run_scheduled_month_rollover();$$
-- );
