import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { BarChart3 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { useCashFlow } from "@/hooks/useChartData";
import { formatMonthYear, moneyAbs } from "@/lib/format";
import type { DateRange } from "@/hooks/useChartData";

const config: ChartConfig = {
  income: { label: "Income", color: "hsl(var(--primary))" },
  expense: { label: "Expense", color: "hsl(var(--destructive))" },
  net: { label: "Net", color: "hsl(var(--gold))" },
};

export function CashFlowChart({ range }: { range: DateRange }) {
  const { data, isLoading } = useCashFlow(range);
  const rows = data ?? [];

  return (
    <CardShell icon={BarChart3} title="Cash Flow" subtitle="Income vs. expenses, month by month">
      {isLoading ? (
        <EmptyRow>Loading…</EmptyRow>
      ) : rows.length === 0 ? (
        <EmptyRow>Upload a document or add a transaction to see this chart</EmptyRow>
      ) : (
        <ChartContainer config={config} className="h-64 w-full">
          <ComposedChart data={rows} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="period_start"
              tickFormatter={(v) => formatMonthYear(v).split(" ")[0]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
            />
            <YAxis tickFormatter={(v) => moneyAbs(v)} tickLine={false} axisLine={false} fontSize={11} width={64} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatMonthYear(v as string)} />} />
            <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Line dataKey="net" stroke="var(--color-net)" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--gold))" }} />
          </ComposedChart>
        </ChartContainer>
      )}
    </CardShell>
  );
}
