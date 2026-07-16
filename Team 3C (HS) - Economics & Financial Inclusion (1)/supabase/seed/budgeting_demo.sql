-- PocketPlanner — Budgeting demo seed
--
-- HOW TO APPLY: run this AFTER 0001-0006 are applied. The SQL editor runs
-- as a superuser with no logged-in session, so there's no auth.uid() to
-- seed "the current user" automatically — paste your own user id below
-- first (Dashboard -> Authentication -> Users -> copy the UUID next to
-- your account), then run the whole file.
--
-- Generates 3 months of realistic transactions (rent, groceries, a
-- couple of subscriptions, dining, transport, one paycheck a month) plus
-- an active 50/30/20 budget for the current month, seeded from those same
-- categories — enough data to demo Track-tab progress bars, pace, and the
-- Charts page immediately without manual data entry.

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- <-- PASTE YOUR USER ID HERE
  v_account_id uuid;
  v_month_offset int;
  v_month_start date;
  v_cat_housing uuid;
  v_cat_food uuid;
  v_cat_transport uuid;
  v_cat_shopping uuid;
  v_cat_entertainment uuid;
  v_cat_subscriptions uuid;
  v_cat_income uuid;
  v_budget_id uuid;
  v_current_period date := date_trunc('month', current_date)::date;
begin
  if v_user_id = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Set v_user_id to your real auth.users id before running this seed script.';
  end if;

  -- Account (reuse the default one if it already exists from signup).
  select id into v_account_id from accounts where user_id = v_user_id order by created_at asc limit 1;
  if v_account_id is null then
    insert into accounts (user_id, name, type, is_default) values (v_user_id, 'Checking', 'checking', true)
    returning id into v_account_id;
  end if;

  select id into v_cat_housing from categories where slug = 'housing' and user_id is null;
  select id into v_cat_food from categories where slug = 'food' and user_id is null;
  select id into v_cat_transport from categories where slug = 'transport' and user_id is null;
  select id into v_cat_shopping from categories where slug = 'shopping' and user_id is null;
  select id into v_cat_entertainment from categories where slug = 'entertainment' and user_id is null;
  select id into v_cat_subscriptions from categories where slug = 'subscriptions' and user_id is null;
  select id into v_cat_income from categories where slug = 'income' and user_id is null;

  -- Three months back through the current month.
  for v_month_offset in 0..2 loop
    v_month_start := (v_current_period - (2 - v_month_offset) * interval '1 month')::date;

    -- Paycheck, twice a month.
    insert into transactions (user_id, account_id, category_id, amount, description, merchant_normalized, tx_date, source)
    values
      (v_user_id, v_account_id, v_cat_income, 2450.00, 'Payroll deposit', 'employer payroll', v_month_start + 4, 'manual'),
      (v_user_id, v_account_id, v_cat_income, 2450.00, 'Payroll deposit', 'employer payroll', v_month_start + 19, 'manual');

    -- Rent, same day every month.
    insert into transactions (user_id, account_id, category_id, amount, description, merchant_normalized, tx_date, source)
    values (v_user_id, v_account_id, v_cat_housing, -1450.00, 'Rent', 'sunview apartments', v_month_start + 0, 'manual');

    -- Subscriptions, small and recurring.
    insert into transactions (user_id, account_id, category_id, amount, description, merchant_normalized, tx_date, source)
    values
      (v_user_id, v_account_id, v_cat_subscriptions, -15.99, 'Streaming', 'streamflix', v_month_start + 2, 'manual'),
      (v_user_id, v_account_id, v_cat_subscriptions, -10.99, 'Music', 'tunewave', v_month_start + 5, 'manual');

    -- Groceries, a handful of trips with natural variation.
    insert into transactions (user_id, account_id, category_id, amount, description, merchant_normalized, tx_date, source)
    values
      (v_user_id, v_account_id, v_cat_food, -round((70 + random() * 40)::numeric, 2), 'Groceries', 'green market', v_month_start + 3, 'manual'),
      (v_user_id, v_account_id, v_cat_food, -round((60 + random() * 35)::numeric, 2), 'Groceries', 'green market', v_month_start + 10, 'manual'),
      (v_user_id, v_account_id, v_cat_food, -round((65 + random() * 35)::numeric, 2), 'Groceries', 'green market', v_month_start + 17, 'manual'),
      (v_user_id, v_account_id, v_cat_food, -round((22 + random() * 18)::numeric, 2), 'Lunch out', 'corner cafe', v_month_start + 8, 'manual'),
      (v_user_id, v_account_id, v_cat_food, -round((28 + random() * 22)::numeric, 2), 'Dinner out', 'ramen house', v_month_start + 15, 'manual');

    -- Transportation.
    insert into transactions (user_id, account_id, category_id, amount, description, merchant_normalized, tx_date, source)
    values
      (v_user_id, v_account_id, v_cat_transport, -round((35 + random() * 20)::numeric, 2), 'Gas', 'shell station', v_month_start + 6, 'manual'),
      (v_user_id, v_account_id, v_cat_transport, -round((30 + random() * 20)::numeric, 2), 'Gas', 'shell station', v_month_start + 21, 'manual'),
      (v_user_id, v_account_id, v_cat_transport, -14.00, 'Transit pass top-up', 'city transit', v_month_start + 12, 'manual');

    -- Shopping / entertainment, more variable.
    insert into transactions (user_id, account_id, category_id, amount, description, merchant_normalized, tx_date, source)
    values
      (v_user_id, v_account_id, v_cat_shopping, -round((25 + random() * 60)::numeric, 2), 'Shopping', 'general store', v_month_start + 9, 'manual'),
      (v_user_id, v_account_id, v_cat_entertainment, -round((15 + random() * 35)::numeric, 2), 'Movie night', 'cinema plex', v_month_start + 13, 'manual');
  end loop;

  -- Active 50/30/20-flavored budget for the current month, sized off the
  -- income above ($4,900/mo): 50% needs, 30% wants, 20% savings-equivalent
  -- (no savings/debt categories seeded here, so just needs + wants).
  insert into budgets (user_id, period, method, income_expected, status)
  values (v_user_id, v_current_period, 'fifty_thirty_twenty', 4900.00, 'active')
  on conflict (user_id, period) do update set status = 'active'
  returning id into v_budget_id;

  insert into budget_lines (user_id, budget_id, category_id, group_name, amount_budgeted, rollover_enabled, sort_order)
  values
    (v_user_id, v_budget_id, v_cat_housing, 'Needs', 1450.00, false, 1),
    (v_user_id, v_budget_id, v_cat_food, 'Needs', 600.00, true, 2),
    (v_user_id, v_budget_id, v_cat_transport, 'Needs', 220.00, false, 3),
    (v_user_id, v_budget_id, v_cat_shopping, 'Wants', 250.00, true, 4),
    (v_user_id, v_budget_id, v_cat_entertainment, 'Wants', 150.00, true, 5),
    (v_user_id, v_budget_id, v_cat_subscriptions, 'Wants', 40.00, false, 6)
  on conflict (budget_id, category_id) do nothing;
end $$;
