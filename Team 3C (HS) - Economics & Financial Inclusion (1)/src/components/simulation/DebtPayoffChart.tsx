import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { CreditCard } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { moneyAbs } from "@/lib/format";
import { toChartPoints } from "@/lib/simulation/chartData";
import { seriesColor } from "@/lib/simulation/seriesColors";
import type { Debt, SimulationOutput, SimulationSettings } from "@/lib/simulation/types";

export function DebtPayoffChart({ output, settings, debts }: { output: SimulationOutput; settings: SimulationSettings; debts: Debt[] }) {
  const points = useMemo(() => toChartPoints(output, settings.granularity), [output, settings.granularity]);

  const flatPoints = useMemo(
    () =>
      points.map((p) => {
        const row: Record<string, number | string> = { label: p.label };
        for (const debt of debts) row[debt.id] = p.debtBalances[debt.id] ?? 0;
        return row;
      }),
    [points, debts],
  );

  const config: ChartConfig = Object.fromEntries(debts.map((d, i) => [d.id, { label: d.label, color: seriesColor(i) }]));

  return (
    <CardShell icon={CreditCard} title="Debt Payoff Timeline" subtitle="Each debt's balance shrinking to zero">
      {debts.length === 0 ? (
        <EmptyRow>No debts in this scenario — nothing to pay off</EmptyRow>
      ) : (
        <ChartContainer config={config} className="h-64 w-full">
          <AreaChart data={flatPoints} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={30} />
            <YAxis tickFormatter={(v) => moneyAbs(Number(v))} tickLine={false} axisLine={false} fontSize={11} width={64} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {debts.map((debt, i) => (
              <Area
                key={debt.id}
                type="monotone"
                dataKey={debt.id}
                stackId="debt"
                stroke={seriesColor(i)}
                fill={seriesColor(i)}
                fillOpacity={0.35}
                isAnimationActive
                animationDuration={400}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      )}
    </CardShell>
  );
}
