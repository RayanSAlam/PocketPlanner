import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";
import type { ImpactScoreHistoryPoint } from "@/lib/impact/types";

const PERIOD_DAYS = 90;
const HISTORY_LIMIT = 6;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export interface FinancialProgressAggregateData {
  sampleSize: number;
  medianNetWorthTrendPct: number | null;
  medianSavingsRateDelta: number | null;
  history: ImpactScoreHistoryPoint[];
}

// Internal/product-team view only. impact_aggregate_scores has NO
// user_id column at all (de-identified by construction, not just by RLS
// — see 0009_impact_measurement.sql), so nothing identifiable is ever
// read, written, or displayed here. Any logged-in user can currently
// trigger this recompute+write, same disclosed simplification as every
// other "no admin/role system yet" tradeoff in this app.
export function useFinancialProgressAggregate() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["impact", "financial-progress-aggregate"],
    enabled: !!session,
    queryFn: async (): Promise<FinancialProgressAggregateData> => {
      const periodEnd = isoDaysAgo(0);
      const periodStart = isoDaysAgo(PERIOD_DAYS);

      const { data, error } = await supabase.rpc("get_financial_progress_aggregate_inputs", {
        p_period_start: periodStart,
        p_period_end: periodEnd,
      });
      if (error) throw error;

      const inputs = data?.[0] ?? { sample_size: 0, median_net_worth_trend_pct: null, median_savings_rate_delta: null };

      const { error: upsertError } = await supabase.from("impact_aggregate_scores").upsert(
        {
          metric_type: "financial_progress",
          period_start: periodStart,
          period_end: periodEnd,
          score: null, // this metric surfaces as two medians, not a single 0-100 composite — see ImpactDashboardPage
          sample_size: inputs.sample_size,
          components: {
            medianNetWorthTrendPct: inputs.median_net_worth_trend_pct,
            medianSavingsRateDelta: inputs.median_savings_rate_delta,
          } as unknown as Json,
        },
        { onConflict: "metric_type,period_end" },
      );
      if (upsertError) console.warn("[impact] failed to cache financial progress aggregate:", upsertError.message);

      const { data: historyRows, error: historyError } = await supabase
        .from("impact_aggregate_scores")
        .select("period_end, sample_size, components")
        .eq("metric_type", "financial_progress")
        .order("period_end", { ascending: true })
        .limit(HISTORY_LIMIT);
      if (historyError) throw historyError;

      const history: ImpactScoreHistoryPoint[] = (historyRows ?? []).map((r) => ({
        windowEnd: r.period_end,
        score: (r.components as { medianNetWorthTrendPct?: number | null } | null)?.medianNetWorthTrendPct ?? null,
        eligible: r.sample_size > 0,
      }));

      return {
        sampleSize: inputs.sample_size,
        medianNetWorthTrendPct: inputs.median_net_worth_trend_pct,
        medianSavingsRateDelta: inputs.median_savings_rate_delta,
        history,
      };
    },
  });
}
