import { TrendingUp, Gauge, Footprints } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useFinancialProgressAggregate } from "@/hooks/useFinancialProgressAggregate";
import { formatDate } from "@/lib/format";

const chartConfig: ChartConfig = {
  score: { label: "Median net worth trend", color: "hsl(var(--primary))" },
};

// Internal/product-team page — NOT gated by any role system, since this
// app has none yet (see impact_aggregate_scores' RLS comment in
// 0009_impact_measurement.sql for the same disclosed simplification).
// It's "internal" by nav placement and convention only, not by access
// control; a real deployment would need a role check here before this
// page (or the aggregate RPCs it calls) shipped to production.
export default function ImpactDashboardPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 md:space-y-8 md:px-8 md:py-8">
      <div>
        <p className="font-mono-data mb-1 text-[11px] uppercase tracking-[0.12em] text-primary">Internal</p>
        <h1 className="font-display text-2xl text-foreground md:text-3xl">Impact Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          De-identified, aggregate signal only — no individual user's data appears on this page. See each score's
          source file for the exact formula.
        </p>
      </div>

      <FinancialProgressAggregateSection />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ComingSoonSection
          icon={Gauge}
          title="Experience Quality Impact"
          subtitle="Is the product itself easy, fast, and satisfying to use?"
        />
        <ComingSoonSection
          icon={Footprints}
          title="Behavioral Action Impact"
          subtitle="Is the simulator actually changing what users do?"
        />
      </div>
    </div>
  );
}

function FinancialProgressAggregateSection() {
  const { data, isLoading } = useFinancialProgressAggregate();

  const points = (data?.history ?? [])
    .filter((h) => h.eligible && h.score !== null)
    .map((h) => ({ label: formatDate(h.windowEnd), score: Math.round((h.score as number) * 1000) / 10 })); // pct -> 1 decimal

  return (
    <CardShell
      icon={TrendingUp}
      title="Financial Progress Impact"
      subtitle="Median across all eligible users (>= 2 snapshots, >= 30 days apart) this quarter"
    >
      {isLoading ? (
        <EmptyRow>Loading…</EmptyRow>
      ) : !data || data.sampleSize === 0 ? (
        <EmptyRow>Not enough eligible users yet — need at least one user with two snapshots 30+ days apart.</EmptyRow>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Sample size" value={String(data.sampleSize)} />
            <Stat
              label="Median net worth trend"
              value={data.medianNetWorthTrendPct !== null ? `${Math.round(data.medianNetWorthTrendPct * 100)}%` : "—"}
            />
            <Stat
              label="Median savings rate delta"
              value={data.medianSavingsRateDelta !== null ? `${Math.round(data.medianSavingsRateDelta * 100)}pp` : "—"}
            />
          </div>

          {points.length > 1 && (
            <ChartContainer config={chartConfig} className="h-40 w-full">
              <LineChart data={points} margin={{ left: 4, right: 4, top: 4 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} minTickGap={30} />
                <YAxis tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} fontSize={10} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={400} />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      )}
    </CardShell>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-secondary/30 p-3">
    <p className="font-display font-mono-data text-xl tabular-nums text-foreground">{value}</p>
    <p className="mt-0.5 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{label}</p>
  </div>
);

const ComingSoonSection = ({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof TrendingUp;
  title: string;
  subtitle: string;
}) => (
  <CardShell icon={Icon} title={title} subtitle={subtitle}>
    <EmptyRow>Coming in the next phase — event instrumentation and scoring aren't wired up yet.</EmptyRow>
  </CardShell>
);
