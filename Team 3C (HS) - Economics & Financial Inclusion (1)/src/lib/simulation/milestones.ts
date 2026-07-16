import type { AccountBucket, SimulationOutput, TimeStep } from "@/lib/simulation/types";

export interface Milestone {
  id: string;
  label: string;
  detail: string;
  month: number;
  year: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMonth(month: number): string {
  const year = Math.floor(month / 12);
  const monthInYear = month % 12;
  return `${MONTH_NAMES[monthInYear]}, Year ${year + 1}`;
}

const cashBalanceAt = (step: TimeStep, cashBucketIds: string[]) =>
  cashBucketIds.reduce((sum, id) => sum + (step.bucketBalances[id] ?? 0), 0);

/**
 * Scans the projection for a handful of interesting, auto-detected
 * moments — not configurable thresholds the user sets, just useful
 * call-outs surfaced from whatever they already modeled.
 */
export function detectMilestones(output: SimulationOutput, buckets: AccountBucket[]): Milestone[] {
  if (output.length === 0) return [];
  const milestones: Milestone[] = [];
  const first = output[0];

  if (first.totalDebt > 0) {
    const freeStep = output.find((s) => s.totalDebt <= 0.005);
    if (freeStep) {
      milestones.push({ id: "debt-free", label: "Debt-free", detail: formatMonth(freeStep.month), month: freeStep.month, year: freeStep.year });
    }
  }

  if (first.netWorth <= 0) {
    const positiveStep = output.find((s) => s.netWorth > 0);
    if (positiveStep) {
      milestones.push({
        id: "net-worth-positive",
        label: "Net worth turns positive",
        detail: formatMonth(positiveStep.month),
        month: positiveStep.month,
        year: positiveStep.year,
      });
    }
  }

  const cashBucketIds = buckets.filter((b) => b.kind === "cash").map((b) => b.id);
  if (cashBucketIds.length > 0) {
    const sampleSize = Math.min(12, output.length);
    const avgMonthlyExpense = output.slice(0, sampleSize).reduce((sum, s) => sum + s.totalExpenses, 0) / sampleSize;
    const target = avgMonthlyExpense * 3; // a common "3 months of expenses" minimum
    if (target > 0 && cashBalanceAt(first, cashBucketIds) < target) {
      const fundedStep = output.find((s) => cashBalanceAt(s, cashBucketIds) >= target);
      if (fundedStep) {
        milestones.push({
          id: "emergency-fund-funded",
          label: "Emergency fund fully funded",
          detail: `${formatMonth(fundedStep.month)} · 3 months of expenses`,
          month: fundedStep.month,
          year: fundedStep.year,
        });
      }
    }
  }

  if (first.netWorth < 1_000_000) {
    const millionStep = output.find((s) => s.netWorth >= 1_000_000);
    if (millionStep) {
      milestones.push({
        id: "net-worth-1m",
        label: "Net worth reaches $1M",
        detail: formatMonth(millionStep.month),
        month: millionStep.month,
        year: millionStep.year,
      });
    }
  }

  return milestones.sort((a, b) => a.month - b.month);
}
