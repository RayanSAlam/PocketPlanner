// Documents the shape of impact_scores.components / impact_aggregate_scores.components
// (jsonb columns — see supabase/migrations/0009_impact_measurement.sql) so
// each score's supporting numbers are typed and inspectable, not just an
// opaque blob. Filled in incrementally as each metric is built.

// src/lib/impact/financialProgressScore.ts
// Every subscore is nullable in lockstep with its raw input: null means
// "no data this window" (e.g. no income, no goals with a target date),
// NOT "neutral/no change" — a subscore of 50 is a real computed value and
// must stay distinguishable from "not computed" wherever this is
// displayed or averaged.
export interface FinancialProgressComponents {
  netWorthSubscore: number;
  savingsRateSubscore: number | null;
  dtiSubscore: number | null;
  goalAttainmentSubscore: number | null;
  netWorthChangePct: number | null;
  savingsRateDeltaPp: number | null;
  dtiDeltaPp: number | null;
  goalAttainmentRate: number | null;
}

// One point in a user's or the aggregate's score-over-time series, read
// back from impact_scores / impact_aggregate_scores for charting (see
// ImpactProgressCard.tsx / ImpactDashboardPage.tsx).
export interface ImpactScoreHistoryPoint {
  windowEnd: string; // ISO date
  score: number | null;
  eligible: boolean;
}
