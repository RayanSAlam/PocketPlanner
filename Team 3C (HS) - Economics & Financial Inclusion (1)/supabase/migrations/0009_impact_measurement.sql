-- PocketPlanner — Impact Measurement schema (event tracking, snapshots,
-- composite scores)
--
-- HOW TO APPLY: paste this whole file into Supabase Dashboard -> SQL Editor
-- -> New query -> Run, AFTER 0001-0008 have already been applied. No CLI
-- needed, same as every prior migration in this project.
--
-- Three metrics, three questions:
--   Financial Progress — is this user's actual financial position improving?
--   Experience Quality  — is the product itself pleasant/fast/easy to use?
--   Behavioral Action   — does the simulator change real behavior, or is it
--                         just a toy people look at once?
-- All three surface as an auditable 0-100 score computed in TypeScript
-- (src/lib/impact/*Score.ts, unit-tested with hand-calculated examples)
-- from raw numbers the RPCs below aggregate. The SQL in this file
-- deliberately contains NO scoring/weighting formula — that logic lives in
-- exactly one place (the TS files above), not duplicated or black-boxed in
-- the database.

-- ============================================================
-- Enums
-- ============================================================
create type impact_metric_type as enum ('financial_progress', 'experience_quality', 'behavioral_action');

-- ============================================================
-- impact_events — the tracking foundation. event_name is plain text (no
-- check constraint) rather than an enum: the closed vocabulary lives in
-- src/lib/impact/eventNames.ts, so adding a new event type is a frontend
-- change, not a migration.
-- ============================================================
create table impact_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  event_name text not null,
  metadata jsonb not null default '{}',
  client_ts timestamptz not null,
  created_at timestamptz not null default now()
);

alter table impact_events enable row level security;
create policy "impact_events_select_own" on impact_events for select using (user_id = auth.uid());
create policy "impact_events_insert_own" on impact_events for insert with check (user_id = auth.uid());

create index impact_events_user_event_idx on impact_events (user_id, event_name, client_ts desc);
create index impact_events_session_idx on impact_events (session_id, event_name);

-- ============================================================
-- impact_snapshots — one row per user per day, written by
-- record_impact_snapshot() (called once per app session, client-side,
-- see useImpactSnapshot.ts). Dedicated numeric columns rather than jsonb
-- because these are charted directly as a time series.
-- ============================================================
create table impact_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  net_worth numeric(12,2) not null,
  total_assets numeric(12,2) not null,
  total_liabilities numeric(12,2) not null,
  trailing_90d_income numeric(12,2) not null,
  trailing_90d_expenses numeric(12,2) not null,
  savings_rate numeric(6,4),
  debt_to_income_ratio numeric(8,4),
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

alter table impact_snapshots enable row level security;
create policy "impact_snapshots_select_own" on impact_snapshots for select using (user_id = auth.uid());
create policy "impact_snapshots_insert_own" on impact_snapshots for insert with check (user_id = auth.uid());
create policy "impact_snapshots_update_own" on impact_snapshots for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create index impact_snapshots_user_date_idx on impact_snapshots (user_id, snapshot_date desc);

-- ============================================================
-- impact_scores — per-user composite score time series. Only
-- 'financial_progress' and 'behavioral_action' are ever written here (the
-- two of the three metrics that are per-user); 'experience_quality' lives
-- only in impact_aggregate_scores below since it's internal-only by design.
-- ============================================================
create table impact_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_type impact_metric_type not null,
  window_start date not null,
  window_end date not null,
  score numeric(5,2),
  eligible boolean not null default false,
  components jsonb not null default '{}',
  computed_at timestamptz not null default now(),
  unique (user_id, metric_type, window_end)
);

alter table impact_scores enable row level security;
create policy "impact_scores_select_own" on impact_scores for select using (user_id = auth.uid());
create policy "impact_scores_insert_own" on impact_scores for insert with check (user_id = auth.uid());
create policy "impact_scores_update_own" on impact_scores for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create index impact_scores_user_metric_idx on impact_scores (user_id, metric_type, window_end desc);

-- ============================================================
-- impact_aggregate_scores — internal/product-team dashboard only.
-- De-identified BY CONSTRUCTION: there is no user_id column at all, not
-- merely one hidden by RLS, so this table cannot leak which user
-- contributed which number even if a policy were ever misconfigured.
--
-- Reads are safe for any logged-in user since rows carry no identifying
-- data. Writes are ALSO open to any authenticated user (not scoped to a
-- particular row) — there is no admin/role system anywhere in this app
-- yet (see README's Impact Measurement section), so the internal
-- dashboard recomputes + upserts these rows from a plain client-side hook
-- whenever any logged-in user visits it, the same "DB aggregates raw
-- numbers, client computes + writes back" split used for impact_scores.
-- This is a disclosed simplification for a project with no service-role
-- session and no real ops team, not something a production deployment
-- should keep as-is (see README's Phase 2 list).
-- ============================================================
create table impact_aggregate_scores (
  id uuid primary key default gen_random_uuid(),
  metric_type impact_metric_type not null,
  period_start date not null,
  period_end date not null,
  score numeric(5,2),
  sample_size int not null default 0,
  components jsonb not null default '{}',
  computed_at timestamptz not null default now(),
  unique (metric_type, period_end)
);

alter table impact_aggregate_scores enable row level security;
create policy "impact_aggregate_scores_select_all" on impact_aggregate_scores for select using (true);
create policy "impact_aggregate_scores_insert_authenticated" on impact_aggregate_scores for insert with check (true);
create policy "impact_aggregate_scores_update_authenticated" on impact_aggregate_scores for update using (true) with check (true);

-- ============================================================
-- impact_settings — one row per user, the opt-in/opt-out toggle for
-- behavioral/usage tracking (event tracking + the micro-survey). Kept
-- separate from notification_settings on purpose: that table is "alert me
-- about my budget," this is "collect usage data about me" — a different
-- consent category. Defaults to true (opt-out), matching every existing
-- toggle in this app (confirmed with the user rather than silently
-- switching this one table to opt-in).
-- ============================================================
create table impact_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  behavioral_tracking_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table impact_settings enable row level security;
create policy "impact_settings_select_own" on impact_settings for select using (user_id = auth.uid());
create policy "impact_settings_insert_own" on impact_settings for insert with check (user_id = auth.uid());
create policy "impact_settings_update_own" on impact_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- goals — bridge columns so "did a simulation turn into a real goal"
-- becomes directly queryable instead of approximated. All nullable or
-- defaulted so this is a no-op for every existing goal.
-- ============================================================
alter table goals
  add column source text not null default 'manual' check (source in ('manual', 'simulation')),
  add column source_simulated_target_date date,
  add column committed_monthly_amount numeric(12,2),
  add column completed_at timestamptz;

create or replace function public.set_goal_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    new.completed_at := now();
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger goals_set_completed_at
  before update on goals
  for each row execute function public.set_goal_completed_at();

-- ============================================================
-- record_impact_snapshot: derives + upserts today's snapshot for the
-- calling user. Account balances aren't a maintained column anywhere in
-- this app yet (no Accounts CRUD exists — see README) — every account
-- starts at 0, so a balance is simply the sum of its transactions.
-- Credit-type accounts are the closest thing to a liability in this
-- schema: a negative balance there means money owed (a liability), a
-- positive balance means an overpayment (an asset). This split keeps
-- net_worth = total_assets - total_liabilities algebraically identical to
-- summing every account's balance directly (transfers between a checking
-- and a credit account net to zero automatically, with no special
-- transfer-handling logic needed).
-- unique(user_id, snapshot_date) + the upsert below makes repeated
-- same-day calls (e.g. two logins in one day) idempotent for free.
-- ============================================================
create or replace function public.record_impact_snapshot()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_non_credit_balance numeric;
  v_credit_balance numeric;
  v_total_assets numeric;
  v_total_liabilities numeric;
  v_net_worth numeric;
  v_income numeric;
  v_expenses numeric;
  v_savings_rate numeric;
  v_dti numeric;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select coalesce(sum(t.amount), 0)
    into v_non_credit_balance
  from transactions t
  join accounts a on a.id = t.account_id
  where t.user_id = v_user_id and t.deleted_at is null and a.type <> 'credit';

  select coalesce(sum(t.amount), 0)
    into v_credit_balance
  from transactions t
  join accounts a on a.id = t.account_id
  where t.user_id = v_user_id and t.deleted_at is null and a.type = 'credit';

  v_total_assets := v_non_credit_balance + greatest(v_credit_balance, 0);
  v_total_liabilities := greatest(-v_credit_balance, 0);
  v_net_worth := v_total_assets - v_total_liabilities;

  select
    coalesce(sum(t.amount) filter (where t.amount > 0), 0),
    coalesce(sum(-t.amount) filter (where t.amount < 0), 0)
    into v_income, v_expenses
  from transactions t
  where t.user_id = v_user_id and t.deleted_at is null
    and t.tx_date between (current_date - interval '89 days')::date and current_date;

  v_savings_rate := case when v_income > 0 then round((v_income - v_expenses) / v_income, 4) else null end;
  -- Annualized-income proxy, not a true monthly-debt-service DTI — this
  -- app has no persisted debt/liability payment schedule (only the
  -- ephemeral simulator's client-side Debt[]). trailing_90d_income * 4
  -- approximates annual income. Documented as a Phase 2 gap in the README.
  v_dti := case when v_income > 0 then round(v_total_liabilities / (v_income * 4), 4) else null end;

  insert into impact_snapshots (
    user_id, snapshot_date, net_worth, total_assets, total_liabilities,
    trailing_90d_income, trailing_90d_expenses, savings_rate, debt_to_income_ratio
  )
  values (
    v_user_id, current_date, v_net_worth, v_total_assets, v_total_liabilities,
    v_income, v_expenses, v_savings_rate, v_dti
  )
  on conflict (user_id, snapshot_date) do update set
    net_worth = excluded.net_worth,
    total_assets = excluded.total_assets,
    total_liabilities = excluded.total_liabilities,
    trailing_90d_income = excluded.trailing_90d_income,
    trailing_90d_expenses = excluded.trailing_90d_expenses,
    savings_rate = excluded.savings_rate,
    debt_to_income_ratio = excluded.debt_to_income_ratio;
end;
$$;
grant execute on function public.record_impact_snapshot() to authenticated;

-- ============================================================
-- get_financial_progress_inputs: raw numbers for the per-user Financial
-- Progress score — savings rates are computed LIVE for the exact
-- [window_start, window_end] and the equal-length window immediately
-- before it (not read off a snapshot's trailing-90d-as-of-snapshot-date,
-- which won't align to arbitrary window boundaries). snapshot_count
-- backs the eligibility gate (>=2 snapshots, >=30 days apart) enforced in
-- src/lib/impact/financialProgressScore.ts.
-- ============================================================
create or replace function public.get_financial_progress_inputs(p_window_start date, p_window_end date)
returns table (
  recent_snapshot_date date,
  recent_net_worth numeric,
  recent_dti numeric,
  prior_snapshot_date date,
  prior_net_worth numeric,
  prior_dti numeric,
  savings_rate_recent numeric,
  savings_rate_prior numeric,
  snapshot_count int,
  eligible_goal_count int,
  attained_goal_count int
)
language sql
stable
security invoker
set search_path = public
as $$
  with window_len as (
    select (p_window_end - p_window_start) as days
  ),
  recent_snap as (
    select snapshot_date, net_worth, debt_to_income_ratio
    from impact_snapshots
    where user_id = auth.uid() and snapshot_date <= p_window_end
    order by snapshot_date desc
    limit 1
  ),
  prior_snap as (
    select snapshot_date, net_worth, debt_to_income_ratio
    from impact_snapshots
    where user_id = auth.uid() and snapshot_date <= p_window_start
    order by snapshot_date desc
    limit 1
  ),
  recent_flow as (
    select
      coalesce(sum(amount) filter (where amount > 0), 0) as income,
      coalesce(sum(-amount) filter (where amount < 0), 0) as expenses
    from transactions
    where user_id = auth.uid() and deleted_at is null
      and tx_date > p_window_start and tx_date <= p_window_end
  ),
  prior_flow as (
    select
      coalesce(sum(amount) filter (where amount > 0), 0) as income,
      coalesce(sum(-amount) filter (where amount < 0), 0) as expenses
    from transactions, window_len
    where user_id = auth.uid() and deleted_at is null
      and tx_date > (p_window_start - window_len.days) and tx_date <= p_window_start
  ),
  snap_count as (
    select count(*) as n from impact_snapshots where user_id = auth.uid() and snapshot_date <= p_window_end
  ),
  goal_stats as (
    select
      count(*) filter (where target_date is not null and target_date <= p_window_end) as eligible,
      count(*) filter (where target_date is not null and target_date <= p_window_end and status = 'completed') as attained
    from goals
    where user_id = auth.uid()
  )
  select
    rs.snapshot_date, rs.net_worth, rs.debt_to_income_ratio,
    ps.snapshot_date, ps.net_worth, ps.debt_to_income_ratio,
    case when rf.income > 0 then round((rf.income - rf.expenses) / rf.income, 4) else null end,
    case when pf.income > 0 then round((pf.income - pf.expenses) / pf.income, 4) else null end,
    sc.n::int,
    gs.eligible::int,
    gs.attained::int
  from snap_count sc
  cross join goal_stats gs
  left join recent_snap rs on true
  left join prior_snap ps on true
  left join recent_flow rf on true
  left join prior_flow pf on true;
$$;
grant execute on function public.get_financial_progress_inputs(date, date) to authenticated;

-- ============================================================
-- get_behavioral_action_inputs: raw numbers for the per-user Behavioral
-- Action score. "Converted" and "plan adherence" are explicitly
-- correlational, not causal — a simulation counts as converted if a
-- simulation-sourced goal or a "mark as my plan" event follows it within
-- 14 days for the SAME user, which is a time-window heuristic, not proof
-- the simulation caused the action (documented again in
-- src/lib/impact/behavioralActionScore.ts, where this matters more).
-- Plan adherence uses a 90% tolerance ("roughly matched" per the
-- product spec's own wording), not an exact-cent comparison.
-- ============================================================
create or replace function public.get_behavioral_action_inputs(p_window_start date, p_window_end date)
returns table (
  simulations_run int,
  simulations_converted int,
  goal_seek_goals_created int,
  plan_adherence_matched_months int,
  plan_adherence_total_months int,
  repeat_engagement_days int
)
language sql
stable
security invoker
set search_path = public
as $$
  with sims as (
    select id, client_ts
    from impact_events
    where user_id = auth.uid() and event_name = 'simulation_completed'
      and client_ts::date between p_window_start and p_window_end
  ),
  converted as (
    select s.id
    from sims s
    where exists (
      select 1 from goals g
      where g.user_id = auth.uid() and g.source = 'simulation'
        and g.created_at >= s.client_ts and g.created_at <= s.client_ts + interval '14 days'
    ) or exists (
      select 1 from impact_events e
      where e.user_id = auth.uid() and e.event_name = 'scenario_marked_as_plan'
        and e.client_ts >= s.client_ts and e.client_ts <= s.client_ts + interval '14 days'
    )
  ),
  goal_seek_goals as (
    select count(*) as n
    from goals
    where user_id = auth.uid() and source = 'simulation'
      and created_at::date between p_window_start and p_window_end
  ),
  committed_goals as (
    select id, created_at::date as start_date,
           least(coalesce(target_date, p_window_end), p_window_end) as end_date,
           committed_monthly_amount
    from goals
    where user_id = auth.uid() and committed_monthly_amount is not null and committed_monthly_amount > 0
      and created_at::date <= p_window_end
  ),
  months as (
    select
      cg.id as goal_id,
      cg.committed_monthly_amount,
      m::date as month_start
    from committed_goals cg,
      lateral generate_series(
        date_trunc('month', greatest(cg.start_date, p_window_start)),
        date_trunc('month', cg.end_date),
        interval '1 month'
      ) as m
  ),
  month_actuals as (
    select
      mo.goal_id, mo.month_start, mo.committed_monthly_amount,
      coalesce(sum(gc.amount), 0) as contributed
    from months mo
    left join goal_contributions gc
      on gc.goal_id = mo.goal_id
      and date_trunc('month', gc.date) = mo.month_start
    group by mo.goal_id, mo.month_start, mo.committed_monthly_amount
  ),
  engagement as (
    select count(distinct client_ts::date) as n
    from impact_events
    where user_id = auth.uid() and event_name = 'simulation_completed'
      and client_ts::date between p_window_start and p_window_end
  )
  select
    (select count(*) from sims)::int,
    (select count(*) from converted)::int,
    (select n from goal_seek_goals)::int,
    (select count(*) filter (where contributed >= committed_monthly_amount * 0.9) from month_actuals)::int,
    (select count(*) from month_actuals)::int,
    (select n from engagement)::int;
$$;
grant execute on function public.get_behavioral_action_inputs(date, date) to authenticated;

-- ============================================================
-- get_experience_quality_inputs: internal-only, aggregated across ALL
-- users. security definer so it can read every user's impact_events
-- (bypassing each row's select_own RLS policy) — safe because the
-- returned shape has no user_id/session_id column, only counts and
-- medians, matching the same "loops over everyone, definer-only" pattern
-- run_scheduled_month_rollover already established in 0006. A "session"
-- here means one impact_events.session_id — task completion is opening
-- the simulator panel and getting a chart to render within the SAME
-- browser tab session.
-- ============================================================
create or replace function public.get_experience_quality_inputs(p_period_start date, p_period_end date)
returns table (
  sample_size int,
  completion_rate numeric,
  median_ttfi_ms numeric,
  error_rate numeric,
  avg_survey_rating numeric,
  adoption_rate numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with opened as (
    select distinct session_id
    from impact_events
    where event_name = 'sim_panel_opened'
      and client_ts::date between p_period_start and p_period_end
  ),
  rendered as (
    select distinct session_id
    from impact_events
    where event_name = 'sim_chart_rendered'
      and client_ts::date between p_period_start and p_period_end
  ),
  advanced as (
    select distinct session_id
    from impact_events
    where event_name = 'sim_advanced_feature_used'
      and client_ts::date between p_period_start and p_period_end
  ),
  ttfi_values as (
    select (metadata->>'msFromOpen')::numeric as ms
    from impact_events
    where event_name = 'sim_chart_rendered'
      and client_ts::date between p_period_start and p_period_end
      and metadata ? 'msFromOpen'
  ),
  error_events as (
    select count(*) as n
    from impact_events
    where event_name in ('sim_validation_error', 'sim_calc_error')
      and client_ts::date between p_period_start and p_period_end
  ),
  survey_ratings as (
    select (metadata->>'rating')::numeric as rating
    from impact_events
    where event_name = 'sim_survey_response'
      and client_ts::date between p_period_start and p_period_end
      and metadata ? 'rating'
  ),
  counts as (
    select
      (select count(*) from opened) as n_opened,
      (select count(*) from opened o where o.session_id in (select session_id from rendered)) as n_completed,
      (select count(*) from opened o where o.session_id in (select session_id from advanced)) as n_advanced
  )
  select
    c.n_opened::int,
    case when c.n_opened > 0 then round(c.n_completed::numeric / c.n_opened, 4) else null end,
    (select percentile_cont(0.5) within group (order by ms) from ttfi_values),
    case when c.n_opened > 0 then round((select n from error_events)::numeric / c.n_opened, 4) else null end,
    (select round(avg(rating), 2) from survey_ratings),
    case when c.n_opened > 0 then round(c.n_advanced::numeric / c.n_opened, 4) else null end
  from counts c;
$$;
grant execute on function public.get_experience_quality_inputs(date, date) to authenticated;

-- ============================================================
-- get_financial_progress_aggregate_inputs: internal-only, de-identified
-- median across all eligible users (same >=2-snapshot / >=30-day-gap gate
-- as the per-user score, applied per user before taking the median so a
-- brand-new user's noisy single data point never enters the aggregate).
-- security definer to read across every user's impact_snapshots.
-- ============================================================
create or replace function public.get_financial_progress_aggregate_inputs(p_period_start date, p_period_end date)
returns table (
  sample_size int,
  median_net_worth_trend_pct numeric,
  median_savings_rate_delta numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with recent_snap as (
    select distinct on (user_id) user_id, snapshot_date, net_worth, savings_rate
    from impact_snapshots
    where snapshot_date <= p_period_end
    order by user_id, snapshot_date desc
  ),
  prior_snap as (
    select distinct on (user_id) user_id, snapshot_date, net_worth, savings_rate
    from impact_snapshots
    where snapshot_date <= p_period_start
    order by user_id, snapshot_date desc
  ),
  eligible as (
    select
      r.user_id,
      case when p.net_worth <> 0 then (r.net_worth - p.net_worth) / abs(p.net_worth) else null end as net_worth_trend_pct,
      case when r.savings_rate is not null and p.savings_rate is not null then r.savings_rate - p.savings_rate else null end as savings_rate_delta
    from recent_snap r
    join prior_snap p on p.user_id = r.user_id
    where r.snapshot_date - p.snapshot_date >= 30
  )
  select
    count(*)::int,
    percentile_cont(0.5) within group (order by net_worth_trend_pct),
    percentile_cont(0.5) within group (order by savings_rate_delta)
  from eligible;
$$;
grant execute on function public.get_financial_progress_aggregate_inputs(date, date) to authenticated;

-- ============================================================
-- get_behavioral_action_aggregate_inputs: internal-only, de-identified
-- median across all users who ran at least one simulation in the period.
-- security definer to read across every user's impact_events/goals/
-- goal_contributions.
-- ============================================================
create or replace function public.get_behavioral_action_aggregate_inputs(p_period_start date, p_period_end date)
returns table (
  sample_size int,
  median_conversion_rate numeric,
  median_goal_setting_rate numeric,
  median_plan_adherence_rate numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with sims as (
    select user_id, id, client_ts
    from impact_events
    where event_name = 'simulation_completed'
      and client_ts::date between p_period_start and p_period_end
  ),
  per_user_sims as (
    select user_id, count(*) as n_sims
    from sims
    group by user_id
  ),
  per_user_converted as (
    select s.user_id, count(*) as n_converted
    from sims s
    where exists (
      select 1 from goals g
      where g.user_id = s.user_id and g.source = 'simulation'
        and g.created_at >= s.client_ts and g.created_at <= s.client_ts + interval '14 days'
    ) or exists (
      select 1 from impact_events e
      where e.user_id = s.user_id and e.event_name = 'scenario_marked_as_plan'
        and e.client_ts >= s.client_ts and e.client_ts <= s.client_ts + interval '14 days'
    )
    group by s.user_id
  ),
  per_user_goal_seek as (
    select user_id, count(*) as n_goal_seek_goals
    from goals
    where source = 'simulation' and created_at::date between p_period_start and p_period_end
    group by user_id
  ),
  committed_goals as (
    select id, user_id, created_at::date as start_date,
           least(coalesce(target_date, p_period_end), p_period_end) as end_date,
           committed_monthly_amount
    from goals
    where committed_monthly_amount is not null and committed_monthly_amount > 0
      and created_at::date <= p_period_end
  ),
  months as (
    select cg.id as goal_id, cg.user_id, cg.committed_monthly_amount, m::date as month_start
    from committed_goals cg,
      lateral generate_series(
        date_trunc('month', greatest(cg.start_date, p_period_start)),
        date_trunc('month', cg.end_date),
        interval '1 month'
      ) as m
  ),
  month_actuals as (
    select
      mo.goal_id, mo.user_id, mo.committed_monthly_amount,
      coalesce(sum(gc.amount), 0) as contributed
    from months mo
    left join goal_contributions gc
      on gc.goal_id = mo.goal_id and date_trunc('month', gc.date) = mo.month_start
    group by mo.goal_id, mo.user_id, mo.committed_monthly_amount
  ),
  per_user_adherence as (
    select user_id,
           count(*) filter (where contributed >= committed_monthly_amount * 0.9)::numeric / count(*) as adherence_rate
    from month_actuals
    group by user_id
  ),
  per_user as (
    select
      pus.user_id,
      pus.n_sims,
      coalesce(puc.n_converted, 0)::numeric / pus.n_sims as conversion_rate,
      coalesce(pugs.n_goal_seek_goals, 0)::numeric / pus.n_sims as goal_setting_rate
    from per_user_sims pus
    left join per_user_converted puc on puc.user_id = pus.user_id
    left join per_user_goal_seek pugs on pugs.user_id = pus.user_id
    where pus.n_sims > 0
  )
  select
    (select count(*) from per_user)::int,
    (select percentile_cont(0.5) within group (order by conversion_rate) from per_user),
    (select percentile_cont(0.5) within group (order by goal_setting_rate) from per_user),
    (select percentile_cont(0.5) within group (order by adherence_rate) from per_user_adherence);
$$;
grant execute on function public.get_behavioral_action_aggregate_inputs(date, date) to authenticated;

-- ============================================================
-- Explicit grants (belt-and-suspenders, matches 0001/0006's convention)
-- ============================================================
grant select, insert, update, delete on impact_events, impact_snapshots, impact_scores, impact_settings to authenticated;
grant select, insert, update on impact_aggregate_scores to authenticated;
