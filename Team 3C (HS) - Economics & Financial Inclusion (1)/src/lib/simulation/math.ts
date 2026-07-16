// Shared financial-math helpers. Every formula here is intentionally small
// and commented, since compound interest and amortization are easy to get
// subtly wrong.

/**
 * Converts an annual rate into the equivalent EFFECTIVE monthly rate under
 * monthly compounding: (1+r_annual) = (1+r_monthly)^12.
 * Used for savings/investment growth, where "6% annual return" should mean
 * the balance actually multiplies by 1.06 over 12 months.
 */
export function annualToEffectiveMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

/**
 * One month of compound growth plus a contribution, added AFTER growth
 * (i.e. the contribution doesn't earn a return in its own first month).
 */
export function compoundMonthlyBalance(balance: number, monthlyRate: number, monthlyContribution: number): number {
  return balance * (1 + monthlyRate) + monthlyContribution;
}

/** Flat-rate tax — a placeholder simple enough to swap for a bracket model later. */
export function computeTax(grossIncome: number, flatRate: number): number {
  const rate = Math.max(0, Math.min(1, flatRate));
  return grossIncome * rate;
}

/**
 * Box-Muller transform: turns two independent uniform(0,1) samples into one
 * standard-normal sample, then scales to the requested mean/stdDev. Used by
 * Monte Carlo mode to sample a plausible investment return each run instead
 * of assuming the expected return happens every single year.
 */
export function sampleNormal(mean: number, stdDev: number, rng: () => number = Math.random): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stdDev;
}

/** Converts a nominal dollar amount at `years` from now into today's ("real") dollars. */
export function deflate(nominalValue: number, inflationRate: number, years: number): number {
  return nominalValue / Math.pow(1 + inflationRate, years);
}

/** Sorted-array percentile (linear interpolation between ranks). `p` is 0-100. */
export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const rank = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sortedValues[lower];
  const weight = rank - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}
