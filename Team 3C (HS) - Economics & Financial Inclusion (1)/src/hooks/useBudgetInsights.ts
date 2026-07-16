import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { computeHeuristicInsights, type BudgetInsight, type InsightCategoryData } from "@/lib/budgeting/heuristicInsights";
import { shiftPeriod } from "@/lib/budgeting/period";
import type { Json } from "@/integrations/supabase/types";

// Cached insights for a period — read-only, so the Track tab can show the
// last analysis without re-running it on every visit.
export function useCachedInsights(period: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["budgeting", "insights", period],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("budget_insights").select("*").eq("period", period).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { insights: data.insights as unknown as BudgetInsight[], generated_at: data.generated_at };
    },
  });
}

async function fetchCategoryHistory(period: string, months: number): Promise<Map<string, number[]>> {
  const history = new Map<string, number[]>();
  for (let i = months; i >= 1; i--) {
    const p = shiftPeriod(period, -i);
    const { data, error } = await supabase.rpc("budget_progress", { p_period: p });
    if (error) throw error;
    for (const row of data ?? []) {
      const list = history.get(row.category_id) ?? [];
      list.push(row.spent);
      history.set(row.category_id, list);
    }
  }
  return history;
}

// "Analyze my budget" — on-demand (or could be called monthly via a
// scheduled job, same as the budget rollover cron). Defaults to the
// heuristic engine (zero deployment, zero API key needed — this IS the
// "mock mode for keyless development" the spec asks for) and would call
// the budget-insights Edge Function instead when VITE_ENABLE_AI_INSIGHTS
// is set AND that function has actually been deployed (see
// supabase/functions/budget-insights — written but not deployed from
// here, same disclosed-limitation pattern as every other Edge Function
// decision this build has made).
export function useAnalyzeBudget(period: string, currentRows: { category_id: string; category_name: string; amount_budgeted: number; spent: number; pct_used: number }[]) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Not authenticated");

      let insights: BudgetInsight[];
      if (import.meta.env.VITE_ENABLE_AI_INSIGHTS === "true") {
        const { data, error } = await supabase.functions.invoke("budget-insights", {
          body: { period, rows: currentRows },
        });
        if (error) throw error;
        insights = data.insights as BudgetInsight[];
      } else {
        const history = await fetchCategoryHistory(period, 3);
        const categoryData: InsightCategoryData[] = currentRows.map((r) => ({
          categoryId: r.category_id,
          categoryName: r.category_name,
          amountBudgeted: r.amount_budgeted,
          spent: r.spent,
          pctUsed: r.pct_used,
          history: history.get(r.category_id) ?? [],
        }));
        const totalIncome = 0; // not currently used by the heuristic engine, kept in the signature for the AI path's prompt parity
        insights = computeHeuristicInsights(categoryData, totalIncome);
      }

      const { error: upsertError } = await supabase
        .from("budget_insights")
        .upsert({ user_id: session.user.id, period, insights: insights as unknown as Json, generated_at: new Date().toISOString() }, { onConflict: "user_id,period" });
      if (upsertError) throw upsertError;

      return insights;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgeting", "insights", period] });
    },
  });
}
