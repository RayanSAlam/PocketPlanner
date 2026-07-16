import type { SimulationInput } from "@/lib/simulation/types";
import { runSimulation } from "@/lib/simulation/engine";

export interface GoalSeekResult {
  achievable: boolean;
  requiredAdditionalMonthlyContribution: number; // total across every bucket combined
  achievedNetWorth: number;
}

const SEARCH_CEILING_PER_BUCKET = 20000; // an extra $20k/mo/bucket is already an absurd upper bound
const ITERATIONS = 30;

function netWorthAtYear(input: SimulationInput, targetYear: number, additionalPerBucket: number): number {
  const adjusted: SimulationInput = {
    ...input,
    buckets: input.buckets.map((b) => ({ ...b, monthlyContribution: b.monthlyContribution + additionalPerBucket })),
    settings: { ...input.settings, horizonYears: Math.max(input.settings.horizonYears, targetYear) },
  };
  const output = runSimulation(adjusted);
  const targetMonth = Math.max(0, targetYear * 12 - 1);
  return output[Math.min(targetMonth, output.length - 1)]?.netWorth ?? 0;
}

/**
 * Binary-searches a single "extra dollars per bucket per month" scale
 * factor so that ending net worth at the target year meets the target —
 * the simplest lever that generalizes across however many savings buckets
 * a scenario has, reported back as one combined dollar figure.
 */
export function solveForMonthlySavings(input: SimulationInput, targetNetWorth: number, targetYear: number): GoalSeekResult {
  if (input.buckets.length === 0) {
    return { achievable: false, requiredAdditionalMonthlyContribution: 0, achievedNetWorth: 0 };
  }

  const baseline = netWorthAtYear(input, targetYear, 0);
  if (baseline >= targetNetWorth) {
    return { achievable: true, requiredAdditionalMonthlyContribution: 0, achievedNetWorth: baseline };
  }

  let lo = 0;
  let hi = SEARCH_CEILING_PER_BUCKET;
  const atCeiling = netWorthAtYear(input, targetYear, hi);
  if (atCeiling < targetNetWorth) {
    return { achievable: false, requiredAdditionalMonthlyContribution: hi * input.buckets.length, achievedNetWorth: atCeiling };
  }

  for (let i = 0; i < ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (netWorthAtYear(input, targetYear, mid) >= targetNetWorth) hi = mid;
    else lo = mid;
  }

  return {
    achievable: true,
    requiredAdditionalMonthlyContribution: hi * input.buckets.length,
    achievedNetWorth: netWorthAtYear(input, targetYear, hi),
  };
}
