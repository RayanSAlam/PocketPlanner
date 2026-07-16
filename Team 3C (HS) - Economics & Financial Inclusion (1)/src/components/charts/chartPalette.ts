// Raw color strings for Recharts fills/strokes — this app has exactly 3
// brand hues (sage/gold/rose) plus neutrals, reused here as status colors
// rather than inventing a categorical palette. See src/lib/categories.ts
// for the equivalent Tailwind-class swatches used outside charts.
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  gold: "hsl(var(--gold))",
  destructive: "hsl(var(--destructive))",
  secondary: "hsl(var(--secondary))",
  muted: "hsl(var(--muted-foreground))",
  border: "hsl(var(--border))",
} as const;

const SWATCH_TO_COLOR: Record<string, string> = {
  sage: CHART_COLORS.primary,
  "sage-soft": CHART_COLORS.primary,
  gold: CHART_COLORS.gold,
  "gold-soft": CHART_COLORS.gold,
  rose: CHART_COLORS.destructive,
  muted: CHART_COLORS.muted,
};

export function swatchToColor(swatch: string | null | undefined): string {
  return (swatch && SWATCH_TO_COLOR[swatch]) || CHART_COLORS.muted;
}

// Budget-vs-actual status: reuses brand hues as meaning, not decoration.
export function budgetStatusColor(pctUsed: number): string {
  if (pctUsed > 100) return CHART_COLORS.destructive;
  if (pctUsed >= 90) return CHART_COLORS.gold;
  return CHART_COLORS.primary;
}
