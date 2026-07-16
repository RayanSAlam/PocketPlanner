import { useMemo } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CardShell } from "@/components/dashboard/CardShell";
import { moneyAbs } from "@/lib/format";
import { deflate } from "@/lib/simulation/math";
import type { LifeEvent, SimulationOutput, SimulationSettings } from "@/lib/simulation/types";
import { toChartPoints } from "@/lib/simulation/chartData";

interface CompareScenario {
  output: SimulationOutput;
  label: string;
}

interface NetWorthChartProps {
  output: SimulationOutput;
  settings: SimulationSettings;
  lifeEvents?: LifeEvent[];
  compare?: CompareScenario | null;
}

// A life event fires at year Y — this maps that to whichever x-axis
// category label the chart is actually using (yearly "Yr N" vs monthly
// "M N"), so the ReferenceLine lands on a real category instead of a
// numeric position the axis doesn't understand.
function eventLabel(year: number, granularity: SimulationSettings["granularity"]): string {
  return granularity === "monthly" ? `M${year * 12 + 1}` : `Yr ${year + 1}`;
}

export function NetWorthChart({ output, settings, lifeEvents = [], compare }: NetWorthChartProps) {
  const points = useMemo(() => {
    const rows = toChartPoints(output, settings.granularity);
    const compareRows = compare ? toChartPoints(compare.output, settings.granularity) : null;
    return rows.map((r, i) => ({
      label: r.label,
      year: r.year,
      savings: settings.realDollars ? deflate(r.totalSavings, settings.inflationRate, r.year) : r.totalSavings,
      debt: -(settings.realDollars ? deflate(r.totalDebt, settings.inflationRate, r.year) : r.totalDebt),
      netWorth: settings.realDollars ? deflate(r.netWorth, settings.inflationRate, r.year) : r.netWorth,
      compareNetWorth: compareRows?.[i]
        ? settings.realDollars
          ? deflate(compareRows[i].netWorth, settings.inflationRate, compareRows[i].year)
          : compareRows[i].netWorth
        : undefined,
    }));
  }, [output, settings, compare]);

  const validLabels = new Set(points.map((p) => p.label));
  const config: ChartConfig = {
    savings: { label: "Savings & Investments", color: "hsl(var(--primary))" },
    debt: { label: "Debt", color: "hsl(var(--destructive))" },
    netWorth: { label: "Net Worth", color: "hsl(var(--gold))" },
    ...(compare ? { compareNetWorth: { label: compare.label, color: "hsl(var(--primary))" } } : {}),
  };

  return (
    <CardShell icon={TrendingUp} title="Net Worth Over Time" subtitle={`Projected over ${settings.horizonYears} years${settings.realDollars ? " · today's dollars" : ""}`}>
      <ChartContainer config={config} className="h-72 w-full">
        <ComposedChart data={points} margin={{ left: 4, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={30} />
          <YAxis tickFormatter={(v) => moneyAbs(v)} tickLine={false} axisLine={false} fontSize={11} width={64} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area type="monotone" dataKey="savings" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.18} isAnimationActive animationDuration={400} />
          <Area type="monotone" dataKey="debt" stroke="none" fill="hsl(var(--destructive))" fillOpacity={0.18} isAnimationActive animationDuration={400} />
          <Line type="monotone" dataKey="netWorth" stroke="hsl(var(--gold))" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={400} />
          {compare && (
            <Line
              type="monotone"
              dataKey="compareNetWorth"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              isAnimationActive
              animationDuration={400}
            />
          )}
          {lifeEvents.map((event) => {
            const x = eventLabel(event.year, settings.granularity);
            if (!validLabels.has(x)) return null;
            return (
              <ReferenceLine
                key={event.id}
                x={x}
                stroke="hsl(var(--foreground) / 0.35)"
                strokeDasharray="4 3"
                label={{ value: event.label, position: "top", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
            );
          })}
        </ComposedChart>
      </ChartContainer>
    </CardShell>
  );
}
