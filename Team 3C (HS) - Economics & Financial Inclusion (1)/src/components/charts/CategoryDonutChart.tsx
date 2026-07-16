import { useMemo } from "react";
import { PieChart, Pie, Cell } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { useCategorySpend } from "@/hooks/useChartData";
import { swatchToColor } from "@/components/charts/chartPalette";
import { moneyAbs } from "@/lib/format";
import type { DateRange } from "@/hooks/useChartData";

// Caps rendered slices at top 5 + "Other" — stays well under a categorical
// series-count ceiling, and every slice is still identified by legend text
// + dollar amount, never by color alone.
const MAX_SLICES = 5;

export function CategoryDonutChart({ range, accountId }: { range: DateRange; accountId: string | null }) {
  const { data, isLoading } = useCategorySpend(range, accountId);

  const { slices, total } = useMemo(() => {
    const rows = data ?? [];
    const sorted = [...rows].sort((a, b) => b.total - a.total);
    const top = sorted.slice(0, MAX_SLICES);
    const rest = sorted.slice(MAX_SLICES);
    const restTotal = rest.reduce((sum, r) => sum + r.total, 0);
    const combined = restTotal > 0 ? [...top, { name: "Other", swatch: "muted", total: restTotal, category_id: null, icon: "circle", pct: 0 }] : top;
    const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
    return { slices: combined, total: grandTotal };
  }, [data]);

  const config: ChartConfig = Object.fromEntries(slices.map((s) => [s.name, { label: s.name, color: swatchToColor(s.swatch) }]));

  return (
    <CardShell icon={PieIcon} title="Spending by Category" subtitle="Where your money went this period">
      {isLoading ? (
        <EmptyRow>Loading…</EmptyRow>
      ) : slices.length === 0 ? (
        <EmptyRow>Upload a document or add a transaction to see this chart</EmptyRow>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative h-48 w-48 shrink-0">
            <ChartContainer config={config} className="mx-auto aspect-square h-48">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => (
                        <span className="flex w-full min-w-[8rem] justify-between gap-3">
                          <span className="text-muted-foreground">{name as string}</span>
                          <span className="font-mono-data tabular-nums text-foreground">{moneyAbs(Number(value))}</span>
                        </span>
                      )}
                    />
                  }
                />
                <Pie data={slices} dataKey="total" nameKey="name" innerRadius={54} outerRadius={80} strokeWidth={2} stroke="hsl(var(--card))">
                  {slices.map((s, i) => (
                    <Cell key={i} fill={swatchToColor(s.swatch)} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display font-mono-data text-xl tabular-nums text-foreground">{moneyAbs(total)}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total spent</span>
            </div>
          </div>
          <ul className="w-full flex-1 space-y-2">
            {slices.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: swatchToColor(s.swatch) }} />
                  <span className="truncate text-foreground">{s.name}</span>
                </span>
                <span className="font-mono-data shrink-0 tabular-nums text-muted-foreground">
                  {moneyAbs(s.total)} <span className="text-[11px]">({total > 0 ? Math.round((s.total / total) * 100) : 0}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CardShell>
  );
}
