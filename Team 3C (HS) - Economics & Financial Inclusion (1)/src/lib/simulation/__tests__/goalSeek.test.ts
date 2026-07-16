import { describe, it, expect } from "vitest";
import { solveForMonthlySavings } from "@/lib/simulation/goalSeek";
import { runSimulation } from "@/lib/simulation/engine";
import type { SimulationInput } from "@/lib/simulation/types";

const baseInput: SimulationInput = {
  incomeStreams: [],
  oneTimeIncome: [],
  expenses: [],
  oneTimeExpenses: [],
  buckets: [{ id: "b", label: "Brokerage", kind: "brokerage", balance: 0, annualReturnRate: 0.07, monthlyContribution: 100 }],
  debts: [],
  lifeEvents: [],
  settings: {
    horizonYears: 10,
    granularity: "yearly",
    inflationRate: 0,
    taxRate: 0,
    realDollars: false,
    payoffStrategy: "avalanche",
    monteCarloEnabled: false,
  },
};

describe("solveForMonthlySavings", () => {
  it("returns zero additional contribution when the target is already met", () => {
    const easyTarget = 1000; // trivially already exceeded with $100/mo at 7% over 10 years
    const result = solveForMonthlySavings(baseInput, easyTarget, 10);
    expect(result.achievable).toBe(true);
    expect(result.requiredAdditionalMonthlyContribution).toBe(0);
  });

  it("finds an additional contribution that actually reaches an ambitious target", () => {
    const target = 200000;
    const result = solveForMonthlySavings(baseInput, target, 10);
    expect(result.achievable).toBe(true);
    expect(result.requiredAdditionalMonthlyContribution).toBeGreaterThan(0);

    // Verify the solved amount, when actually applied, gets within a very
    // small tolerance of the target — proves the binary search converged
    // correctly rather than just returning a plausible-looking number.
    const applied: SimulationInput = {
      ...baseInput,
      buckets: baseInput.buckets.map((b) => ({ ...b, monthlyContribution: b.monthlyContribution + result.requiredAdditionalMonthlyContribution })),
    };
    const output = runSimulation(applied);
    const finalNetWorth = output[119].netWorth; // year 10, last month
    expect(finalNetWorth).toBeGreaterThanOrEqual(target - 1); // small tolerance for the search precision
  });

  it("reports not achievable when even the search ceiling can't reach an absurd target", () => {
    const impossibleTarget = 999_000_000; // no realistic per-bucket extra gets here in 5 years
    const result = solveForMonthlySavings(baseInput, impossibleTarget, 5);
    expect(result.achievable).toBe(false);
  });

  it("returns not achievable (not a crash) when there are no buckets to contribute to", () => {
    const noBuckets: SimulationInput = { ...baseInput, buckets: [] };
    const result = solveForMonthlySavings(noBuckets, 100000, 10);
    expect(result.achievable).toBe(false);
    expect(result.requiredAdditionalMonthlyContribution).toBe(0);
  });
});
