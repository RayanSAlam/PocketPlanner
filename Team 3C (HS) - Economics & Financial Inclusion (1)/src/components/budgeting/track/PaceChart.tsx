import { useMemo } from "react";
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Activity } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { useSpendingTrend } from "@/hooks/useChartData";
import { shiftPeriod, periodEnd } from "@/lib/budgeting/period";
import { moneyAbs } from "@/lib/format";

const config: ChartConfig = {
  cumulative_spend: { label: "This month", color: "hsl(var(--gold))" },
  budget_pace: { label: "Budget pace", color: "hsl(var(--primary))" },
  last_month: { label: "Last month", color: "hsl(var(--muted-foreground))" },
};

export function PaceChart({ period }: { period: string }) {
  const prevPeriod = shiftPeriod(period, -1);
  const { data: thisMonth = [], isLoading: loadingThis } = useSpendingTrend({ start: period, end: periodEnd(period) });
  const { data: lastMonth = [], isLoading: loadingLast } = useSpendingTrend({ start: prevPeriod, end: periodEnd(prevPeriod) });

  const points = useMemo(() => {
    const lastByDay = new Map(lastMonth.map((r, i) => [i + 1, r.cumulative_spend]));
    return thisMonth.map((r, i) => ({
      day: i + 1,
      cumulative_spend: r.cumulative_spend,
      budget_pace: r.budget_pace,
      last_month: lastByDay.get(i + 1) ?? null,
    }));
  }, [thisMonth, lastMonth]);

  const isLoading = loadingThis || loadingLast;

  return (
    <CardShell icon={Activity} title="Pace this month" subtitle="Cumulative spend vs. your budget pace and last month">
      {isLoading ? (
        <EmptyRow>Loading…</EmptyRow>
      ) : points.length === 0 ? (
        <EmptyRow>Not enough data yet this month</EmptyRow>
      ) : (
        <ChartContainer config={config} className="h-64 w-full">
          <ComposedChart data={points} margin={{ left: 4, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tickFormatter={(v) => `Day ${v}`} tickLine={false} axisLine={false} fontSize={11} minTickGap={30} />
            <YAxis tickFormatter={(v) => moneyAbs(v)} tickLine={false} axisLine={false} fontSize={11} width={64} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => `Day ${v}`} />} />
            <Area type="monotone" dataKey="last_month" stroke="none" fill="var(--color-last_month)" fillOpacity={0.12} connectNulls />
            <Line type="monotone" dataKey="budget_pace" stroke="var(--color-budget_pace)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
            <Line type="monotone" dataKey="cumulative_spend" stroke="var(--color-cumulative_spend)" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ChartContainer>
      )}
    </CardShell>
  );
}
