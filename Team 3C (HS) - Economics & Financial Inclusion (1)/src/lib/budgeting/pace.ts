export type PaceStatus = "under" | "on-pace" | "over";

export interface PaceResult {
  status: PaceStatus;
  percentOver: number; // 0 when under/on-pace
}

// Compares spend-so-far against the LINEAR expectation for the day of
// month — day 10 of a 30-day month "should" have used 33% of the budget.
// A small tolerance band (5%) keeps normal day-to-day noise from flipping
// the status back and forth.
export function computePaceStatus(spent: number, amountBudgeted: number, dayOfMonth: number, daysInMonth: number): PaceResult {
  if (amountBudgeted <= 0) return { status: spent > 0 ? "over" : "on-pace", percentOver: 0 };
  const expectedSoFar = amountBudgeted * (dayOfMonth / daysInMonth);
  if (expectedSoFar <= 0) return { status: spent > 0 ? "over" : "on-pace", percentOver: 0 };

  const ratio = spent / expectedSoFar;
  if (ratio <= 1.05) return { status: ratio < 0.95 ? "under" : "on-pace", percentOver: 0 };
  return { status: "over", percentOver: Math.round((ratio - 1) * 100) };
}

export type MonthHealth = "green" | "amber" | "red";

export function computeMonthHealth(totalSpent: number, totalBudgeted: number, dayOfMonth: number, daysInMonth: number): MonthHealth {
  const { status, percentOver } = computePaceStatus(totalSpent, totalBudgeted, dayOfMonth, daysInMonth);
  if (status !== "over") return "green";
  return percentOver > 15 ? "red" : "amber";
}

export interface SafeToSpendLine {
  groupName: string;
  amountBudgeted: number;
  spent: number;
}

export interface SafeToSpendResult {
  perDay: number;
  daysRemaining: number;
  remainingFlexible: number;
}

// "Safe to spend" only counts flexible (non-fixed) categories — a rent
// line doesn't tell you anything useful about today's discretionary
// spending room. Everything NOT in the fixed group counts as flexible;
// v1 treats "Needs" as the fixed group (matches the wizard's own seeding).
export function computeSafeToSpend(lines: SafeToSpendLine[], daysRemaining: number, fixedGroupName = "Needs"): SafeToSpendResult {
  const flexible = lines.filter((l) => l.groupName !== fixedGroupName);
  const remainingFlexible = flexible.reduce((s, l) => s + (l.amountBudgeted - l.spent), 0);
  const days = Math.max(1, daysRemaining);
  return {
    perDay: Math.max(0, remainingFlexible) / days,
    daysRemaining: days,
    remainingFlexible,
  };
}
