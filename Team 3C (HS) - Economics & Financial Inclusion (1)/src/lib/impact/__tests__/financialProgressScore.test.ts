import { describe, it, expect } from "vitest";
import { computeFinancialProgressScore, type FinancialProgressRawInputs } from "@/lib/impact/financialProgressScore";

function makeInputs(overrides: Partial<FinancialProgressRawInputs>): FinancialProgressRawInputs {
  return {
    recent_snapshot_date: "2026-07-01",
    recent_net_worth: 10000,
    recent_dti: null,
    prior_snapshot_date: "2026-04-01",
    prior_net_worth: 10000,
    prior_dti: null,
    savings_rate_recent: null,
    savings_rate_prior: null,
    snapshot_count: 2,
    eligible_goal_count: 0,
    attained_goal_count: 0,
    ...overrides,
  };
}

describe("computeFinancialProgressScore", () => {
  it("is not eligible with only a single snapshot", () => {
    const result = computeFinancialProgressScore(
      makeInputs({ snapshot_count: 1, prior_snapshot_date: null, prior_net_worth: null }),
    );
    expect(result.eligible).toBe(false);
    expect(result.score).toBeNull();
    expect(result.components).toBeNull();
  });

  it("is not eligible when the two snapshots are less than 30 days apart", () => {
    const result = computeFinancialProgressScore(
      makeInputs({ recent_snapshot_date: "2026-07-01", prior_snapshot_date: "2026-06-20" }),
    );
    expect(result.eligible).toBe(false);
    expect(result.score).toBeNull();
  });

  it("is eligible at exactly 30 days apart", () => {
    const result = computeFinancialProgressScore(
      makeInputs({ recent_snapshot_date: "2026-07-01", prior_snapshot_date: "2026-06-01" }),
    );
    expect(result.eligible).toBe(true);
  });

  // Hand-calculated: net worth +10% -> 75, savings rate +7pp -> 85,
  // DTI -5pp (improvement) -> 75, goal attainment 1/2 -> 50.
  // Composite = (75 + 85 + 75 + 50) / 4 = 71.25.
  it("computes the composite as an equal-weighted average of all four subscores when every input is available", () => {
    const result = computeFinancialProgressScore(
      makeInputs({
        recent_net_worth: 11000,
        prior_net_worth: 10000,
        savings_rate_recent: 0.15,
        savings_rate_prior: 0.08,
        recent_dti: 0.15,
        prior_dti: 0.2,
        eligible_goal_count: 2,
        attained_goal_count: 1,
      }),
    );
    expect(result.eligible).toBe(true);
    expect(result.score).toBeCloseTo(71.25, 2);
    expect(result.components?.netWorthSubscore).toBeCloseTo(75, 5);
    expect(result.components?.savingsRateSubscore).toBeCloseTo(85, 5);
    expect(result.components?.dtiSubscore).toBeCloseTo(75, 5);
    expect(result.components?.goalAttainmentSubscore).toBeCloseTo(50, 5);
    expect(result.components?.netWorthChangePct).toBeCloseTo(0.1, 5);
  });

  // Hand-calculated: net worth +5% -> 62.5, savings rate unchanged -> 50.
  // No DTI data (both null) and no goals with a target date -> both
  // subscores null and excluded from the average entirely, NOT averaged
  // in as a neutral 50. Composite = (62.5 + 50) / 2 = 56.25.
  it("excludes subscores with no underlying data from the composite instead of treating them as neutral", () => {
    const result = computeFinancialProgressScore(
      makeInputs({
        recent_net_worth: 10500,
        prior_net_worth: 10000,
        savings_rate_recent: 0.1,
        savings_rate_prior: 0.1,
        recent_dti: null,
        prior_dti: null,
        eligible_goal_count: 0,
        attained_goal_count: 0,
      }),
    );
    expect(result.eligible).toBe(true);
    expect(result.score).toBeCloseTo(56.25, 2);
    expect(result.components?.dtiSubscore).toBeNull();
    expect(result.components?.goalAttainmentSubscore).toBeNull();
  });

  // Hand-calculated: every delta saturates its scale in the bad direction
  // (net worth -20%, savings rate -10pp, DTI +10pp, 0/1 goals attained)
  // -> all four subscores clamp to exactly 0. Composite = 0.
  it("floors the composite at 0 for a broad decline, without going negative", () => {
    const result = computeFinancialProgressScore(
      makeInputs({
        recent_net_worth: 8000,
        prior_net_worth: 10000,
        savings_rate_recent: 0.05,
        savings_rate_prior: 0.15,
        recent_dti: 0.3,
        prior_dti: 0.2,
        eligible_goal_count: 1,
        attained_goal_count: 0,
      }),
    );
    expect(result.score).toBeCloseTo(0, 5);
  });

  // Edge case: a $0 prior net worth makes a percentage change undefined
  // (division by zero) — falls back to a direction-only read (positive
  // now -> 100) rather than excluding net worth, since it's otherwise
  // guaranteed available whenever the eligibility gate passes.
  it("falls back to a direction-only net worth subscore when prior net worth was exactly zero", () => {
    const result = computeFinancialProgressScore(
      makeInputs({ recent_net_worth: 500, prior_net_worth: 0 }),
    );
    expect(result.components?.netWorthChangePct).toBeNull();
    expect(result.components?.netWorthSubscore).toBe(100);
    expect(result.score).toBe(100);
  });

  it("clamps a swing larger than the scale to exactly 0 or 100, not beyond", () => {
    const result = computeFinancialProgressScore(
      makeInputs({ recent_net_worth: 20000, prior_net_worth: 10000 }), // +100%, way past the ±20% scale
    );
    expect(result.components?.netWorthSubscore).toBe(100);
  });
});
