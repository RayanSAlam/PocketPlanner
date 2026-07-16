// Local-date-safe period helpers — matches src/lib/format.ts's todayIso()
// pattern (toLocaleDateString("en-CA") gives YYYY-MM-DD in the browser's
// own timezone), avoiding the off-by-one-day bug toISOString() has near
// midnight (it converts to UTC first).
function isoDate(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

export function periodOf(d: Date): string {
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function currentPeriod(): string {
  return periodOf(new Date());
}

export function shiftPeriod(period: string, deltaMonths: number): string {
  const [y, m] = period.split("-").map(Number);
  return periodOf(new Date(y, m - 1 + deltaMonths, 1));
}

export function monthsAgoPeriod(n: number): string {
  return shiftPeriod(currentPeriod(), -n);
}

export function todayIso(): string {
  return isoDate(new Date());
}

// Day-of-month accounting for pace/safe-to-spend math. dayOfMonth is
// 1-indexed and clamped to the period's own day count — if `period` isn't
// the actual current month (viewing history), we still want a sane number
// rather than "today's" day-of-month bleeding into a different month's math.
export function daysInMonth(period: string): number {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function dayOfMonthWithin(period: string): number {
  const total = daysInMonth(period);
  if (period !== currentPeriod()) return total; // treat a past/future period as "fully elapsed"
  return Math.min(new Date().getDate(), total);
}

export function daysRemainingInMonth(period: string): number {
  return daysInMonth(period) - dayOfMonthWithin(period) + 1;
}

export function periodEnd(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return isoDate(new Date(y, m - 1, daysInMonth(period)));
}
