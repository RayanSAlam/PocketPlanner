# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/1fca42b0-3baf-4b49-87a0-19e7688bf946

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1fca42b0-3baf-4b49-87a0-19e7688bf946) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1fca42b0-3baf-4b49-87a0-19e7688bf946) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Budgeting feature

The Budgeting page (`/budgeting`) has three tabs — Plan (a spreadsheet-style
grid), Track (live progress against the current month), and Goals (savings
targets and debt payoff). This section documents the parts that aren't
obvious from reading the code cold.

### Data model

- **`budgets`** is a period *header* — one row per `(user_id, period)`
  where `period` is always the first of the month. It holds the chosen
  method (`fifty_thirty_twenty` / `zero_based` / `envelope` / `custom`),
  expected income, and a `draft`/`active` status.
- **`budget_lines`** is one row per category *within* a budget period —
  `amount_budgeted`, `rollover_enabled`, an optional
  `sinking_fund_target_annual`, and `group_name` (freeform text, not a
  foreign key — "renaming a group" is just a bulk string update across
  every line that shares it, and "moving a category between groups" is
  just changing one line's `group_name`).
- **`budget_adjustments`** is an append-only changelog (move / increase /
  decrease) written by the Track tab's overspend banner, via the atomic
  `record_budget_adjustment()` RPC (migration `0007`) so a "move $30 from
  Dining to Groceries" action can never half-apply — line updates and the
  changelog entry happen in one Postgres transaction.
- **`goals`** + **`goal_contributions`**: a goal is either `save` (progress
  = starting balance + contributions, moving toward `target_amount`) or
  `paydown` (progress = starting balance *minus* contributions, moving
  toward `target_amount`, which is usually 0 but can be a nonzero payoff
  target like "get this card under $1,000").
- **`notification_settings`** is one row per user (self-healing — created
  on first read, same pattern as the default "Cash" account). There's
  deliberately no `notifications` table: alerts are computed live from
  `budget_progress` each time the bell opens rather than persisted as
  event rows, since nothing here needs an audit trail.
- **`budget_insights`** caches the last "Analyze my budget" result per
  period (`insights jsonb`), so the Track tab doesn't need to recompute on
  every visit.

The core read path for both the Plan grid and the Track tab is the
`budget_progress(p_period)` RPC — one query returns budgeted / spent /
remaining / rollover-in / pct-used / last-month-spent per line, keeping
"how much has this category actually spent" logic in exactly one place.

### Rollover semantics

Rollover is **computed live, never persisted as a running balance**.
`budget_progress()` joins to the *previous* period's `budget_lines` +
that period's actual spend, and if a line has `rollover_enabled = true`,
its unspent (or overspent) amount from last month becomes this month's
`rollover_in`. This means:

- Turning rollover on/off doesn't need any backfill — it just changes
  whether next month's query includes the term.
- Rollover can never silently drift out of sync with reality, because
  it's recalculated from the source transactions every time, not carried
  forward as a stored number.
- A category with `rollover_enabled = false` simply has `rollover_in = 0`
  regardless of what happened last month.

Month-to-month advancement (via "Copy last month" in the UI, or the
scheduled job below) is a *separate* concept from rollover — it copies
the **plan** (which categories, at what budgeted amounts) forward via
`materialize_next_period()`; rollover then adjusts the **available**
balance for those copied lines based on actual spend, computed at read
time as described above.

### Scheduled month rollover

`run_scheduled_month_rollover()` (migration `0006`) is a `security
definer` function meant to run monthly via `pg_cron`, advancing every
user's active budget into the new month. It's intentionally **not**
granted to the `authenticated` role — it loops over every user in one
pass, so it must only ever be triggered by the cron schedule (commented
out at the bottom of `0006_budgeting_schema.sql`), never callable
directly by a client. Enabling it requires turning on the `pg_cron`
extension in the Supabase dashboard first; until then, budgets still
advance fine via the manual "Copy last month" button.

### Budget Insights — mock mode vs. real AI

"Analyze my budget" produces 3–5 plain-arithmetic insights (win /
warning / suggestion) from budget-vs-actual data. There are two paths
producing the *identical* output shape, so the UI never needs to know
which one ran:

- **Default ("mock mode")**: `src/lib/budgeting/heuristicInsights.ts`
  runs entirely client-side — no API key, no deployment, no network call
  beyond Supabase itself. It flags categories over budget three months
  running, subscriptions that have crept up for three months straight,
  budgets consistently under-used enough to redirect toward a goal, and
  a single "you're doing fine here" win (capped at one, so it doesn't
  crowd out the more useful signals).
- **Real AI (opt-in)**: `supabase/functions/budget-insights/` is a Deno
  Edge Function calling the Anthropic Messages API with a strict-JSON
  system prompt, given only aggregated category totals — never raw
  transaction descriptions or merchant names. It falls back to a small
  inline heuristic (not the shared client one — Edge Functions bundle
  their own directory, so this is deliberately self-contained) if
  `ANTHROPIC_API_KEY` isn't set or the API call fails, so it degrades
  gracefully rather than erroring.

To turn on the real AI path: `supabase functions deploy budget-insights`,
`supabase secrets set ANTHROPIC_API_KEY=sk-...`, then set
`VITE_ENABLE_AI_INSIGHTS=true` in the frontend env. Until you do, the
heuristic path is what runs — it was written as a real feature in its own
right, not a placeholder.

### Applying the migrations

There's no Supabase CLI session wired up for this project, so migrations
are plain `.sql` files under `supabase/migrations/`, applied by pasting
each one (in order) into the Supabase Dashboard's SQL Editor. Because of
that, `src/integrations/supabase/types.ts` is **hand-written**, not
CLI-generated — if you add or change a migration, update that file to
match, since nothing enforces they stay in sync.

## Impact Measurement

PocketPlanner tracks whether the app actually helps, not just whether
people click around. Three independent metrics, each answering a
different question — schema in `supabase/migrations/0009_impact_measurement.sql`,
event vocabulary in `src/lib/impact/eventNames.ts`:

1. **Financial Progress Impact** — *is this user's financial position
   actually improving?* Formula: `src/lib/impact/financialProgressScore.ts`
   (unit-tested with hand-calculated examples in
   `src/lib/impact/__tests__/financialProgressScore.test.ts`). Surfaces as
   the "Your Progress" card on the dashboard (`ImpactProgressCard.tsx`) and
   a de-identified median in the internal Impact Dashboard
   (`/impact-dashboard`). **Status: live.**
2. **Experience Quality Impact** — *is the product itself easy, fast, and
   satisfying to use?* Event names and the aggregating RPC
   (`get_experience_quality_inputs`) already exist; only 2 of ~9 events
   (`sim_panel_opened`, `sim_chart_rendered`) are actually fired yet, from
   `SimulationPage.tsx`. **Status: not built.**
3. **Behavioral Action Impact** — *does using the simulator change real
   behavior, or is it a one-time toy?* RPCs (`get_behavioral_action_inputs`
   and its aggregate variant) and the `goals` bridge columns
   (`source`, `source_simulated_target_date`, `committed_monthly_amount`)
   exist; no scoring, no event firing (`sim_advanced_feature_used`,
   `simulation_completed`, `scenario_marked_as_plan`), no UI. **Status: not
   built.**

Every score is a plain, documented, clamped-linear formula computed in
TypeScript from raw numbers a Postgres RPC aggregates — never a hidden
weighting or model, since this involves people's real finances. Each
per-user score is cached as its own time-series row in `impact_scores`;
each de-identified aggregate lives in `impact_aggregate_scores`, which has
**no `user_id` column at all** (de-identified by construction, not merely
by a row-level-security policy that could be misconfigured).

### Privacy

`impact_settings` (one row per user, defaults to tracking **on**, same
opt-out convention as every other toggle in this app) gates both
`trackEvent()` calls and the micro-survey once it exists. Financial
snapshots (`impact_snapshots`) are derived entirely from data the app
already collects for its own features (transactions, accounts, goals) —
nothing new or more sensitive is captured to build these metrics.

### Known gaps (disclosed, not silently worked around)

- **Debt-to-income ratio** (`record_impact_snapshot()`) is an
  *annualized-income proxy* (`liabilities / (trailing_90d_income * 4)`),
  not a true monthly-debt-service DTI — this app has no persisted
  debt/liability payment schedule, only the simulator's ephemeral
  client-side `Debt[]`.
- **Plan adherence** (Behavioral Action) depends on `committed_monthly_amount`
  actually being set on a goal and `goal_contributions` being logged
  against it — there's no recurring-transfer automation yet, so this is
  only as good as what a user manually logs.
- **No admin/role system exists anywhere in this app.** The internal
  Impact Dashboard (`/impact-dashboard`) is internal by nav placement and
  convention only, not by access control — any logged-in user can
  currently open it or trigger its aggregate recompute. A real deployment
  needs a role check before this ships past internal use.
- **No linked bank accounts.** Net worth is derived purely from
  transactions logged inside PocketPlanner (`sum of transactions per
  account`, credit accounts split into asset/liability by sign) — an
  account balance the user never logs a transaction for is invisible to
  every metric here.
