import type { Database } from "@/integrations/supabase/types";
import type { FinancialProgressComponents } from "./types";

// The RPC's own row shape is the single source of truth for field names —
// no separate camelCase mapping layer, so there's nowhere for the two to
// drift apart. See get_financial_progress_inputs in
// supabase/migrations/0009_impact_measurement.sql.
export type FinancialProgressRawInputs =
  Database["public"]["Functions"]["get_financial_progress_inputs"]["Returns"][number];

export interface FinancialProgressResult {
  eligible: boolean;
  score: number | null;
  components: FinancialProgressComponents | null;
}

// Full width of the "no change at all" -> "maxed out" scale for each raw
// delta, expressed in the delta's own units. Deliberately simple, named
// constants rather than anything tuned from real user data — a ±20% net
// worth swing or a ±10 percentage point savings-rate/DTI swing over a
// 3-month window fully saturates that subscore to 0 or 100; 50 always
// means "no change". Tune here if these turn out too generous/strict.
const NET_WORTH_HALF_SCALE_PCT = 0.20;
const SAVINGS_RATE_HALF_SCALE_PP = 0.10;
const DTI_HALF_SCALE_PP = 0.10;

// Maps a signed delta to a 0-100 subscore: 0 at -halfScale, 50 at 0,
// 100 at +halfScale, clamped beyond that range. `invert` flips the sign
// first, for metrics where a *decrease* is the improvement (DTI).
function scaleDeltaToSubscore(delta: number, halfScale: number, invert: boolean): number {
  const signed = invert ? -delta : delta;
  const clamped = Math.max(-halfScale, Math.min(halfScale, signed));
  return 50 + (clamped / halfScale) * 50;
}

function computeNetWorthSubscore(recentNetWorth: number, priorNetWorth: number): { pct: number | null; subscore: number } {
  if (priorNetWorth === 0) {
    // Can't express "percent change from zero" meaningfully. Fall back to
    // a coarse direction-only read rather than excluding net worth
    // entirely (it's the one input guaranteed to exist whenever the
    // eligibility gate passes) — documented as a deliberate edge-case
    // fallback, not a general-purpose rule.
    const subscore = recentNetWorth > 0 ? 100 : recentNetWorth < 0 ? 0 : 50;
    return { pct: null, subscore };
  }
  const pct = (recentNetWorth - priorNetWorth) / Math.abs(priorNetWorth);
  return { pct, subscore: scaleDeltaToSubscore(pct, NET_WORTH_HALF_SCALE_PCT, false) };
}

/**
 * computeFinancialProgressScore — the ONE place the Financial Progress
 * Impact 0-100 composite is calculated. Deliberately simple and fully
 * auditable: every subscore is a clamped linear map from a raw,
 * plainly-named delta (see FinancialProgressComponents), never a hidden
 * weighting or ML model, because this score is about real people's real
 * finances.
 *
 * Eligibility gate: requires at least 2 snapshots, with the most recent
 * and the prior one at least 30 days apart — otherwise a new user with a
 * single data point would get a meaningless "0% change" score. Matches
 * the product spec's own fairness requirement.
 *
 * Composite = equal-weighted average of whichever subscores had real
 * underlying data this window (income was $0 all window -> no savings
 * rate; no goals with a target date -> no goal attainment; etc. all
 * produce a null raw value, which drops that subscore's weight to zero
 * instead of dragging the composite toward a fake neutral 50).
 */
export function computeFinancialProgressScore(inputs: FinancialProgressRawInputs): FinancialProgressResult {
  const {
    recent_snapshot_date,
    recent_net_worth,
    recent_dti,
    prior_snapshot_date,
    prior_net_worth,
    prior_dti,
    savings_rate_recent,
    savings_rate_prior,
    snapshot_count,
    eligible_goal_count,
    attained_goal_count,
  } = inputs;

  const hasBothSnapshots = recent_snapshot_date !== null && prior_snapshot_date !== null && prior_net_worth !== null && recent_net_worth !== null;
  const daysApart = hasBothSnapshots
    ? (Date.parse(recent_snapshot_date as string) - Date.parse(prior_snapshot_date as string)) / 86_400_000
    : 0;
  const eligible = snapshot_count >= 2 && hasBothSnapshots && daysApart >= 30;

  if (!eligible) {
    return { eligible: false, score: null, components: null };
  }

  const { pct: netWorthChangePct, subscore: netWorthSubscore } = computeNetWorthSubscore(recent_net_worth as number, prior_net_worth as number);

  const savingsRateDeltaPp =
    savings_rate_recent !== null && savings_rate_prior !== null ? savings_rate_recent - savings_rate_prior : null;
  const savingsRateSubscore =
    savingsRateDeltaPp !== null ? scaleDeltaToSubscore(savingsRateDeltaPp, SAVINGS_RATE_HALF_SCALE_PP, false) : null;

  const dtiDeltaPp = recent_dti !== null && prior_dti !== null ? recent_dti - prior_dti : null;
  const dtiSubscore = dtiDeltaPp !== null ? scaleDeltaToSubscore(dtiDeltaPp, DTI_HALF_SCALE_PP, true) : null;

  const goalAttainmentRate = eligible_goal_count > 0 ? attained_goal_count / eligible_goal_count : null;
  const goalAttainmentSubscore = goalAttainmentRate !== null ? goalAttainmentRate * 100 : null;

  const availableSubscores = [netWorthSubscore, savingsRateSubscore, dtiSubscore, goalAttainmentSubscore].filter(
    (s): s is number => s !== null,
  );
  // Guaranteed non-empty: netWorthSubscore is always computable once the
  // eligibility gate passes (both snapshots' net_worth columns are NOT
  // NULL in the DB).
  const score = Math.round((availableSubscores.reduce((sum, s) => sum + s, 0) / availableSubscores.length) * 100) / 100;

  const components: FinancialProgressComponents = {
    netWorthSubscore,
    savingsRateSubscore,
    dtiSubscore,
    goalAttainmentSubscore,
    netWorthChangePct,
    savingsRateDeltaPp,
    dtiDeltaPp,
    goalAttainmentRate,
  };

  return { eligible: true, score, components };
}
