import type { Database } from "@/integrations/supabase/types";

export type BudgetMethod = Database["public"]["Enums"]["budget_method"];

// The 8 system category slugs that make sense as *expense* budget lines —
// deliberately excludes 'income' and 'transfer', which aren't things you
// budget a spending limit for.
export const DEFAULT_EXPENSE_SLUGS = [
  "housing",
  "food",
  "transport",
  "health",
  "shopping",
  "entertainment",
  "subscriptions",
  "other",
] as const;

export const GROUP_BY_SLUG: Record<string, "Needs" | "Wants"> = {
  housing: "Needs",
  food: "Needs",
  transport: "Needs",
  health: "Needs",
  shopping: "Wants",
  entertainment: "Wants",
  subscriptions: "Wants",
  other: "Wants",
};

// Sensible percent-of-income defaults when there's no transaction history
// to seed from yet. Deliberately sums to ~72%, leaving room for savings —
// only zero-based mode scales these up to fill 100% (see below).
const PERCENT_DEFAULTS: Record<string, number> = {
  housing: 0.28,
  food: 0.12,
  transport: 0.1,
  health: 0.04,
  shopping: 0.06,
  entertainment: 0.05,
  subscriptions: 0.03,
  other: 0.04,
};

// $180 -> $200: round up to the nearest $25, a friendlier number to see in
// a budget cell than an exact historical average. Subtracts a tiny epsilon
// before dividing so floating-point noise (5000 * 0.28 === 1400.0000000000002
// in JS) doesn't push an already-exact multiple of 25 up to the next one.
export function roundFriendly(amount: number): number {
  if (amount <= 0) return 0;
  return Math.ceil((amount - 1e-6) / 25) * 25;
}

export interface AllocationLine {
  slug: string;
  group: "Needs" | "Wants";
  amountBudgeted: number;
  basedOnHistory: boolean;
}

// historicalAverages: slug -> average monthly spend over the lookback
// window, only for slugs where the user actually has transaction history.
export function computeMethodAllocation(
  method: BudgetMethod,
  income: number,
  historicalAverages: Partial<Record<string, number>> = {},
): AllocationLine[] {
  let lines = DEFAULT_EXPENSE_SLUGS.map((slug) => {
    const historical = historicalAverages[slug];
    if (historical !== undefined && historical > 0) {
      return { slug, group: GROUP_BY_SLUG[slug], amountBudgeted: roundFriendly(historical), basedOnHistory: true };
    }
    return { slug, group: GROUP_BY_SLUG[slug], amountBudgeted: roundFriendly(income * PERCENT_DEFAULTS[slug]), basedOnHistory: false };
  });

  // Zero-based must sum to exactly the expected income — scale every line
  // proportionally to close the gap rather than inventing a savings
  // category that doesn't exist in the schema.
  if (method === "zero_based" && income > 0) {
    const sum = lines.reduce((s, l) => s + l.amountBudgeted, 0);
    if (sum > 0) {
      const scale = income / sum;
      lines = lines.map((l) => ({ ...l, amountBudgeted: round2(l.amountBudgeted * scale) }));
    }
  }

  return lines;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
