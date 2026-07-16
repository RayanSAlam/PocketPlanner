import { useMemo } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Dices, Loader2 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { moneyAbs } from "@/lib/format";
import { toMonteCarloChartPoints, type MonteCarloResult } from "@/lib/simulation/monteCarlo";
import type { SimulationSettings } from "@/lib/simulation/types";

const config: ChartConfig = {
  p50: { label: "Median projection", color: "hsl(var(--gold))" },
  bandHeight: { label: "10th–90th percentile", color: "hsl(var(--gold))" },
};

interface MonteCarloChartProps {
  result: MonteCarloResult | null;
  settings: SimulationSettings;
  showSpinner: boolean;
}

export function MonteCarloChart({ result, settings, showSpinner }: MonteCarloChartProps) {
  const points = useMemo(() => (result ? toMonteCarloChartPoints(result, settings.granularity) : []), [result, settings.granularity]);

  return (
    <CardShell
      icon={Dices}
      title="Monte Carlo Range"
      subtitle={result ? `${result.runs} simulated futures — 10th–90th percentile band` : "A range of outcomes, not one falsely-precise line"}
      action={showSpinner ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" /> : undefined}
    >
      {!result ? (
        <EmptyRow>Turn on Monte Carlo mode in Simulation Settings to see a range of outcomes</EmptyRow>
      ) : (
        <ChartContainer config={config} className="h-72 w-full">
          <ComposedChart data={points} margin={{ left: 4, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={30} />
            <YAxis tickFormatter={(v) => moneyAbs(v)} tickLine={false} axisLine={false} fontSize={11} width={64} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area dataKey="p10" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
            <Area dataKey="bandHeight" stackId="band" stroke="none" fill="hsl(var(--gold))" fillOpacity={0.18} isAnimationActive animationDuration={400} />
            <Line dataKey="p50" stroke="hsl(var(--gold))" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={400} />
          </ComposedChart>
        </ChartContainer>
      )}
    </CardShell>
  );
}
