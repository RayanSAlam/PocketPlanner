import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { useSpendingTrend } from "@/hooks/useChartData";
import { formatDate, moneyAbs } from "@/lib/format";
import type { DateRange } from "@/hooks/useChartData";

const config: ChartConfig = {
  cumulative_spend: { label: "Spent so far", color: "hsl(var(--primary))" },
  budget_pace: { label: "Budget pace", color: "hsl(var(--gold))" },
};

export function SpendingTrendChart({ range }: { range: DateRange }) {
  const { data, isLoading } = useSpendingTrend(range);
  const rows = data ?? [];
  const hasSpend = rows.some((r) => r.cumulative_spend > 0);

  return (
    <CardShell icon={TrendingUp} title="Spending Trend" subtitle="Cumulative spend vs. your budget pace">
      {isLoading ? (
        <EmptyRow>Loading…</EmptyRow>
      ) : !hasSpend ? (
        <EmptyRow>Upload a document or add a transaction to see this chart</EmptyRow>
      ) : (
        <ChartContainer config={config} className="h-64 w-full">
          <LineChart data={rows} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tickFormatter={(v) => formatDate(v)} tickLine={false} axisLine={false} fontSize={11} minTickGap={40} />
            <YAxis tickFormatter={(v) => moneyAbs(v)} tickLine={false} axisLine={false} fontSize={11} width={64} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatDate(v as string)} />} />
            <Line dataKey="cumulative_spend" stroke="var(--color-cumulative_spend)" strokeWidth={2.5} dot={false} />
            <Line dataKey="budget_pace" stroke="var(--color-budget_pace)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
          </LineChart>
        </ChartContainer>
      )}
    </CardShell>
  );
}
