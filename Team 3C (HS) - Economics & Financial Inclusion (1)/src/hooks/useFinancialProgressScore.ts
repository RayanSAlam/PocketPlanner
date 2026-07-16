import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { computeFinancialProgressScore } from "@/lib/impact/financialProgressScore";
import type { FinancialProgressComponents, ImpactScoreHistoryPoint } from "@/lib/impact/types";
import type { Json } from "@/integrations/supabase/types";

const WINDOW_DAYS = 90;
const HISTORY_LIMIT = 6;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export interface FinancialProgressData {
  eligible: boolean;
  score: number | null;
  components: FinancialProgressComponents | null;
  recentNetWorth: number | null;
  priorNetWorth: number | null;
  savingsRateRecent: number | null;
  savingsRatePrior: number | null;
  history: ImpactScoreHistoryPoint[];
}

const EMPTY_RESULT: FinancialProgressData = {
  eligible: false,
  score: null,
  components: null,
  recentNetWorth: null,
  priorNetWorth: null,
  savingsRateRecent: null,
  savingsRatePrior: null,
  history: [],
};

// Computes this user's Financial Progress score for "the last 3 months
// vs. the 3 months before that", caches it into impact_scores (one row
// per distinct window_end/day, so visiting daily naturally builds a
// chartable time series), and returns both the current result and a
// short history for the trend line. Recomputed on every mount rather
// than on a schedule — this app has no background job runner, so "the
// user opened the dashboard" is the closest thing to a refresh trigger
// (same tradeoff useImpactSnapshot and useBudgetInsights make).
export function useFinancialProgressScore() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["impact", "financial-progress", session?.user.id],
    enabled: !!session,
    queryFn: async (): Promise<FinancialProgressData> => {
      const windowEnd = isoDaysAgo(0);
      const windowStart = isoDaysAgo(WINDOW_DAYS);

      const { data, error } = await supabase.rpc("get_financial_progress_inputs", {
        p_window_start: windowStart,
        p_window_end: windowEnd,
      });
      if (error) throw error;

      const inputs = data?.[0];
      if (!inputs) return EMPTY_RESULT;

      const result = computeFinancialProgressScore(inputs);

      // "DB aggregates raw numbers, client computes + writes back" — same
      // split documented in supabase/migrations/0009_impact_measurement.sql.
      const { error: upsertError } = await supabase.from("impact_scores").upsert(
        {
          user_id: session!.user.id,
          metric_type: "financial_progress",
          window_start: windowStart,
          window_end: windowEnd,
          score: result.score,
          eligible: result.eligible,
          components: (result.components ?? {}) as unknown as Json,
        },
        { onConflict: "user_id,metric_type,window_end" },
      );
      if (upsertError) console.warn("[impact] failed to cache financial progress score:", upsertError.message);

      const { data: historyRows, error: historyError } = await supabase
        .from("impact_scores")
        .select("window_end, score, eligible")
        .eq("metric_type", "financial_progress")
        .order("window_end", { ascending: true })
        .limit(HISTORY_LIMIT);
      if (historyError) throw historyError;

      const history: ImpactScoreHistoryPoint[] = (historyRows ?? []).map((r) => ({
        windowEnd: r.window_end,
        score: r.score,
        eligible: r.eligible,
      }));

      return {
        eligible: result.eligible,
        score: result.score,
        components: result.components,
        recentNetWorth: inputs.recent_net_worth,
        priorNetWorth: inputs.prior_net_worth,
        savingsRateRecent: inputs.savings_rate_recent,
        savingsRatePrior: inputs.savings_rate_prior,
        history,
      };
    },
  });
}
