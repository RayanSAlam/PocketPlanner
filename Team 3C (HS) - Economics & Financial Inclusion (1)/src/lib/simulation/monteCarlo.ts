import type { Granularity, SimulationInput } from "@/lib/simulation/types";
import { runSimulation } from "@/lib/simulation/engine";
import { sampleNormal, percentile } from "@/lib/simulation/math";

export interface MonteCarloPoint {
  month: number;
  year: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface MonteCarloResult {
  points: MonteCarloPoint[];
  runs: number;
}

/** A reasonable broad-market annual-volatility assumption for a mixed portfolio. */
export const DEFAULT_RETURN_STD_DEV = 0.15;

/**
 * Runs the deterministic engine N times. Each run resamples every bucket's
 * return rate from a normal distribution once per year (held constant for
 * that year's 12 months, resampled fresh the next year) instead of
 * assuming the expected return happens every single year — that's the
 * "annual-level noise, not monthly" simplification. Returns the
 * 10th/50th/90th percentile net worth at each month across all runs,
 * instead of one falsely-precise line.
 */
export function runMonteCarloBatch(
  input: SimulationInput,
  runs = 300,
  stdDev = DEFAULT_RETURN_STD_DEV,
  rng: () => number = Math.random,
): MonteCarloResult {
  const totalMonths = Math.max(1, Math.round(input.settings.horizonYears * 12));
  const netWorthByMonth: number[][] = Array.from({ length: totalMonths }, () => []);

  for (let run = 0; run < runs; run++) {
    const sampledRates = new Map<string, number>();
    const rateFor = (bucketId: string, year: number, defaultRate: number): number => {
      const key = `${bucketId}:${year}`;
      let rate = sampledRates.get(key);
      if (rate === undefined) {
        rate = sampleNormal(defaultRate, stdDev, rng);
        sampledRates.set(key, rate);
      }
      return rate;
    };

    const output = runSimulation(input, { returnRateOverride: rateFor });
    output.forEach((step, i) => netWorthByMonth[i].push(step.netWorth));
  }

  const points: MonteCarloPoint[] = netWorthByMonth.map((values, month) => {
    const sorted = [...values].sort((a, b) => a - b);
    return {
      month,
      year: Math.floor(month / 12),
      p10: percentile(sorted, 10),
      p50: percentile(sorted, 50),
      p90: percentile(sorted, 90),
    };
  });

  return { points, runs };
}

export interface MonteCarloChartPoint {
  label: string;
  p10: number;
  p50: number;
  p90: number;
  bandHeight: number; // p90 - p10, used to stack a visible band on an invisible p10 baseline
}

/** Same label/aggregation convention as chartData.ts's toChartPoints, but for percentile bands (always a snapshot, never summed — percentiles aren't a flow quantity). */
export function toMonteCarloChartPoints(result: MonteCarloResult, granularity: Granularity): MonteCarloChartPoint[] {
  const toPoint = (label: string, p: MonteCarloPoint): MonteCarloChartPoint => ({
    label,
    p10: p.p10,
    p50: p.p50,
    p90: p.p90,
    bandHeight: p.p90 - p.p10,
  });

  if (granularity === "monthly") {
    return result.points.map((p) => toPoint(`M${p.month + 1}`, p));
  }

  const years = Array.from(new Set(result.points.map((p) => p.year))).sort((a, b) => a - b);
  return years.map((year) => {
    const monthsInYear = result.points.filter((p) => p.year === year);
    return toPoint(`Yr ${year + 1}`, monthsInYear[monthsInYear.length - 1]);
  });
}
