import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { PiggyBank } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { moneyAbs } from "@/lib/format";
import { toChartPoints } from "@/lib/simulation/chartData";
import { seriesColor } from "@/lib/simulation/seriesColors";
import type { AccountBucket, SimulationOutput, SimulationSettings } from "@/lib/simulation/types";

export function SavingsBucketChart({ output, settings, buckets }: { output: SimulationOutput; settings: SimulationSettings; buckets: AccountBucket[] }) {
  const points = useMemo(() => toChartPoints(output, settings.granularity), [output, settings.granularity]);

  const flatPoints = useMemo(
    () =>
      points.map((p) => {
        const row: Record<string, number | string> = { label: p.label };
        for (const bucket of buckets) row[bucket.id] = p.bucketBalances[bucket.id] ?? 0;
        return row;
      }),
    [points, buckets],
  );

  const config: ChartConfig = Object.fromEntries(buckets.map((b, i) => [b.id, { label: b.label, color: seriesColor(i) }]));

  return (
    <CardShell icon={PiggyBank} title="Savings Growth by Bucket" subtitle="Each account's contribution to your total savings">
      {buckets.length === 0 ? (
        <EmptyRow>No savings buckets in this scenario yet</EmptyRow>
      ) : (
        <ChartContainer config={config} className="h-64 w-full">
          <AreaChart data={flatPoints} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={30} />
            <YAxis tickFormatter={(v) => moneyAbs(Number(v))} tickLine={false} axisLine={false} fontSize={11} width={64} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {buckets.map((bucket, i) => (
              <Area
                key={bucket.id}
                type="monotone"
                dataKey={bucket.id}
                stackId="savings"
                stroke={seriesColor(i)}
                fill={seriesColor(i)}
                fillOpacity={0.4}
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
