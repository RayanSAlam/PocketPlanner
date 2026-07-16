// Cycles through the app's 3 real brand hues (sage/gold/rose) plus tint
// steps, for charts with a variable number of series (per-debt, per-bucket)
// where we can't know the count ahead of time.
const SERIES_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--gold))",
  "hsl(var(--destructive))",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--gold) / 0.55)",
  "hsl(var(--destructive) / 0.55)",
];

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}
