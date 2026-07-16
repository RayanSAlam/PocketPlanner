import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { BarChart3 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CardShell } from "@/components/dashboard/CardShell";
import { moneyAbs } from "@/lib/format";
import { toChartPoints } from "@/lib/simulation/chartData";
import type { SimulationOutput, SimulationSettings } from "@/lib/simulation/types";

const config: ChartConfig = {
  netIncome: { label: "Income", color: "hsl(var(--primary))" },
  totalExpenses: { label: "Expenses", color: "hsl(var(--destructive))" },
};

export function IncomeExpenseChart({ output, settings }: { output: SimulationOutput; settings: SimulationSettings }) {
  const points = useMemo(() => toChartPoints(output, settings.granularity), [output, settings.granularity]);

  return (
    <CardShell icon={BarChart3} title="Income vs. Expenses" subtitle="What comes in against what goes out">
      <ChartContainer config={config} className="h-64 w-full">
        <BarChart data={points} margin={{ left: 4, right: 4 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={30} />
          <YAxis tickFormatter={(v) => moneyAbs(v)} tickLine={false} axisLine={false} fontSize={11} width={64} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="netIncome" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Bar dataKey="totalExpenses" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ChartContainer>
    </CardShell>
  );
}
