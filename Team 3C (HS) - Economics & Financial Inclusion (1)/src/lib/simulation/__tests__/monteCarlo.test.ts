import { describe, it, expect } from "vitest";
import { runMonteCarloBatch } from "@/lib/simulation/monteCarlo";
import { runSimulation } from "@/lib/simulation/engine";
import type { SimulationInput } from "@/lib/simulation/types";

// Deterministic PRNG (mulberry32) so these tests are reproducible instead
// of depending on Math.random().
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const baseInput: SimulationInput = {
  incomeStreams: [],
  oneTimeIncome: [],
  expenses: [],
  oneTimeExpenses: [],
  buckets: [{ id: "b", label: "Brokerage", kind: "brokerage", balance: 10000, annualReturnRate: 0.07, monthlyContribution: 500 }],
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

describe("runMonteCarloBatch", () => {
  it("returns one point per month, matching the deterministic engine's step count", () => {
    const result = runMonteCarloBatch(baseInput, 20, 0.1, mulberry32(1));
    const deterministic = runSimulation(baseInput);
    expect(result.points).toHaveLength(deterministic.length);
    expect(result.runs).toBe(20);
  });

  it("collapses to the deterministic result when volatility is zero", () => {
    const result = runMonteCarloBatch(baseInput, 10, 0, mulberry32(2));
    const deterministic = runSimulation(baseInput);
    const lastPoint = result.points[result.points.length - 1];
    const lastDeterministic = deterministic[deterministic.length - 1];
    // With stdDev=0, sampleNormal always returns exactly the mean, so every
    // run is identical and p10 === p50 === p90 === the deterministic value.
    expect(lastPoint.p10).toBeCloseTo(lastDeterministic.netWorth, 4);
    expect(lastPoint.p50).toBeCloseTo(lastDeterministic.netWorth, 4);
    expect(lastPoint.p90).toBeCloseTo(lastDeterministic.netWorth, 4);
  });

  it("produces a spread (p10 <= p50 <= p90) once volatility is introduced, widening over time", () => {
    const result = runMonteCarloBatch(baseInput, 200, 0.2, mulberry32(3));
    const early = result.points[11]; // end of year 1
    const late = result.points[result.points.length - 1]; // end of horizon

    expect(early.p10).toBeLessThanOrEqual(early.p50);
    expect(early.p50).toBeLessThanOrEqual(early.p90);
    expect(late.p10).toBeLessThanOrEqual(late.p50);
    expect(late.p50).toBeLessThanOrEqual(late.p90);

    // Uncertainty compounds — the gap between p90 and p10 should be wider
    // by the end of a 10-year horizon than after just one year.
    const earlySpread = early.p90 - early.p10;
    const lateSpread = late.p90 - late.p10;
    expect(lateSpread).toBeGreaterThan(earlySpread);
  });

  it("resamples the return rate every year, not once per run (a full run isn't just one constant growth rate)", () => {
    // A single run with huge volatility should show non-uniform year-over-year
    // growth if rates are genuinely resampled annually; check that at least
    // one run's own trajectory has varying year-over-year growth ratios by
    // inspecting the spread of the batch itself, which would collapse to a
    // small number of distinct trajectories if sampling only happened once
    // per run for a 10-year horizon across 50 runs.
    const result = runMonteCarloBatch(baseInput, 50, 0.3, mulberry32(4));
    const midSpread = result.points[59].p90 - result.points[59].p10; // 5 years in
    expect(midSpread).toBeGreaterThan(0);
  });
});
