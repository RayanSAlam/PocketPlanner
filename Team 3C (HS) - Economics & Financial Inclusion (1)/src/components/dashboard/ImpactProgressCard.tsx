import { LineChart as LineChartIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useFinancialProgressScore } from "@/hooks/useFinancialProgressScore";
import { formatDate } from "@/lib/format";

function pct(n: number): string {
  return `${Math.round(Math.abs(n) * 100)}%`;
}

// "Your net worth is up 12% over the last 3 months" — built directly
// from the same recent/prior numbers the score itself is computed from,
// so the sentence and the number can never disagree.
function netWorthSentence(pctChange: number | null, recent: number | null, prior: number | null): string | null {
  if (pctChange !== null) {
    return pctChange >= 0
      ? `Your estimated net worth is up ${pct(pctChange)} over the last 3 months.`
      : `Your estimated net worth is down ${pct(pctChange)} over the last 3 months.`;
  }
  if (recent !== null && prior === 0) {
    return recent > 0
      ? "Your estimated net worth moved from $0 into positive territory over the last 3 months."
      : "Your estimated net worth hasn't moved from $0 over the last 3 months.";
  }
  return null;
}

function savingsRateSentence(recent: number | null, prior: number | null): string | null {
  if (recent === null || prior === null) return null;
  return `Your savings rate moved from ${Math.round(prior * 100)}% to ${Math.round(recent * 100)}%.`;
}

const chartConfig: ChartConfig = {
  score: { label: "Financial Progress Score", color: "hsl(var(--gold))" },
};

export function ImpactProgressCard() {
  const { data, isLoading } = useFinancialProgressScore();

  const points = (data?.history ?? [])
    .filter((h) => h.eligible && h.score !== null)
    .map((h) => ({ label: formatDate(h.windowEnd), score: h.score }));

  return (
    <CardShell
      icon={LineChartIcon}
      title="Your Progress"
      subtitle="An estimated read on how your finances have moved — not financial advice"
      action={
        data?.eligible && data.score !== null ? (
          <div className="text-right">
            <p className="font-display font-mono-data text-2xl tabular-nums text-foreground">{Math.round(data.score)}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">out of 100</p>
          </div>
        ) : null
      }
    >
      {isLoading ? (
        <EmptyRow>Loading…</EmptyRow>
      ) : !data?.eligible ? (
        <EmptyRow>
          Keep using PocketPlanner — once you have two snapshots at least 30 days apart, your progress will show up
          here.
        </EmptyRow>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-1.5 text-sm text-foreground">
            {[
              netWorthSentence(data.components?.netWorthChangePct ?? null, data.recentNetWorth, data.priorNetWorth),
              savingsRateSentence(data.savingsRateRecent, data.savingsRatePrior),
            ]
              .filter((s): s is string => s !== null)
              .map((s) => (
                <li key={s}>{s}</li>
              ))}
          </ul>

          {points.length > 1 && (
            <ChartContainer config={chartConfig} className="h-32 w-full">
              <LineChart data={points} margin={{ left: 4, right: 4, top: 4 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} minTickGap={30} />
                <YAxis domain={[0, 100]} hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--gold))" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={400} />
              </LineChart>
            </ChartContainer>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-xs sm:grid-cols-4">
            <Subscore label="Net worth" value={data.components?.netWorthSubscore ?? null} />
            <Subscore label="Savings rate" value={data.components?.savingsRateSubscore ?? null} />
            <Subscore label="Debt-to-income" value={data.components?.dtiSubscore ?? null} />
            <Subscore label="Goal attainment" value={data.components?.goalAttainmentSubscore ?? null} />
          </div>
        </div>
      )}
    </CardShell>
  );
}

const Subscore = ({ label, value }: { label: string; value: number | null }) => (
  <div>
    <p className="font-mono-data tabular-nums text-foreground">{value === null ? "—" : Math.round(value)}</p>
    <p className="text-muted-foreground">{label}</p>
  </div>
);
