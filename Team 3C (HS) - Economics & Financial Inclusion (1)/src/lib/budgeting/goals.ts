import type { Database } from "@/integrations/supabase/types";

export type GoalType = Database["public"]["Enums"]["goal_type"];

export interface GoalShape {
  type: GoalType;
  target_amount: number;
  starting_amount: number;
}

export interface GoalProgress {
  current: number; // saved-so-far (save) or remaining balance (paydown)
  percent: number; // 0-100, clamped
  remaining: number; // dollars still needed to hit target
}

// "save": current = starting + contributed, moving toward target_amount.
// "paydown": contributions pay the balance DOWN — current is what's LEFT
// to pay, moving from starting_amount toward target_amount (usually 0,
// but could be a nonzero payoff goal like "get this card under $1,000").
export function computeGoalProgress(goal: GoalShape, totalContributed: number): GoalProgress {
  if (goal.type === "save") {
    const current = goal.starting_amount + totalContributed;
    const percent = goal.target_amount > 0 ? clamp((current / goal.target_amount) * 100, 0, 100) : 0;
    return { current, percent, remaining: Math.max(goal.target_amount - current, 0) };
  }

  const span = goal.starting_amount - goal.target_amount;
  const current = Math.max(goal.starting_amount - totalContributed, goal.target_amount);
  const percent = span > 0 ? clamp(((goal.starting_amount - current) / span) * 100, 0, 100) : 100;
  return { current, percent, remaining: Math.max(current - goal.target_amount, 0) };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// "$208/mo to hit $2,500 by Dec" — null when the target date has already
// passed or the goal is already achieved (nothing further required).
export function computeRequiredMonthlyContribution(remaining: number, targetDateIso: string | null, fromDate: Date = new Date()): number | null {
  if (remaining <= 0) return null;
  if (!targetDateIso) return null;
  const target = parseLocalDate(targetDateIso);
  const monthsRemaining = monthsBetween(fromDate, target);
  if (monthsRemaining <= 0) return null;
  return Math.round((remaining / monthsRemaining) * 100) / 100;
}

// `new Date("2026-12-14")` parses a date-only ISO string as UTC midnight,
// which reads back as the PREVIOUS day in any timezone behind UTC once you
// call .getDate()/.getMonth() on it (those return local time components).
// Goal target_date values from the DB are plain date strings — parse them
// as local-midnight instead, same fix period.ts already applies elsewhere.
function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  // Partial credit for the current month based on day-of-month, so "target
  // date is in 3 weeks" doesn't round up to a full extra month of room.
  const dayFraction = (to.getDate() - from.getDate()) / 30;
  return Math.max(0, months + dayFraction);
}

// "at your current pace: Feb 2027" — projects forward from the average
// monthly contribution rate seen so far. Null when there's no measurable
// pace yet (no contributions) or the goal is already complete.
export function computeProjectedCompletion(remaining: number, avgMonthlyContribution: number, fromDate: Date = new Date()): string | null {
  if (remaining <= 0) return null;
  if (avgMonthlyContribution <= 0) return null;
  const monthsNeeded = Math.ceil(remaining / avgMonthlyContribution);
  const projected = new Date(fromDate.getFullYear(), fromDate.getMonth() + monthsNeeded, 1);
  return projected.toISOString().slice(0, 10);
}

// Average $/month contributed so far — total contributed divided by the
// span from the earliest contribution to now (at least 1 month, so a
// single contribution logged today doesn't divide by ~0 and blow up the
// projected-completion math).
export function computeAvgMonthlyContribution(contributions: { amount: number; date: string }[], fromDate: Date = new Date()): number {
  if (contributions.length === 0) return 0;
  const dates = contributions.map((c) => parseLocalDate(c.date).getTime());
  const earliest = new Date(Math.min(...dates));
  const total = contributions.reduce((s, c) => s + c.amount, 0);
  const monthsSpan = Math.max(1, monthsBetween(earliest, fromDate));
  return total / monthsSpan;
}

export const MILESTONE_THRESHOLDS = [25, 50, 75, 100] as const;

// Which milestones does `currentPercent` clear that `previousPercent`
// hadn't yet — drives one-time celebration triggers rather than
// re-celebrating the same milestone on every render.
export function getNewlyCrossedMilestones(previousPercent: number, currentPercent: number): number[] {
  return MILESTONE_THRESHOLDS.filter((m) => previousPercent < m && currentPercent >= m);
}
