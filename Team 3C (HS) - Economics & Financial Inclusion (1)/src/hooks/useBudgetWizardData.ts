import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { monthsAgoPeriod, todayIso } from "@/lib/budgeting/period";

// Step 1: "we detected $X/month" — average of the last 3 months' income
// from get_cash_flow (already used by the Charts page), 0 if no history.
export function useDetectedIncome() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["budgeting", "wizard", "detected-income"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cash_flow", { p_start: monthsAgoPeriod(3), p_end: todayIso() });
      if (error) throw error;
      const rows = data ?? [];
      const withIncome = rows.filter((r) => r.income > 0);
      if (withIncome.length === 0) return 0;
      const avg = withIncome.reduce((s, r) => s + r.income, 0) / withIncome.length;
      return Math.round(avg);
    },
  });
}

// Step 3: per-category average monthly spend over however much history
// exists (capped at 3 months back) — feeds computeMethodAllocation's
// "based on your average of $X/mo" seeding.
export function useHistoricalCategoryAverages() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["budgeting", "wizard", "category-averages"],
    enabled: !!session,
    queryFn: async () => {
      const { data: earliest, error: earliestError } = await supabase
        .from("transactions")
        .select("tx_date")
        .is("deleted_at", null)
        .order("tx_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (earliestError) throw earliestError;
      if (!earliest) return { averages: {} as Record<string, number>, monthsOfHistory: 0 };

      const start = monthsAgoPeriod(3);
      const earliestDate = new Date(earliest.tx_date);
      const cutoffDate = new Date(start);
      const effectiveStart = earliestDate > cutoffDate ? earliest.tx_date : start;

      const monthsElapsed = Math.max(
        1,
        Math.min(3, Math.ceil((Date.now() - new Date(effectiveStart).getTime()) / (30 * 24 * 60 * 60 * 1000))),
      );

      const { data, error } = await supabase.rpc("get_category_spend", { p_start: effectiveStart, p_end: todayIso() });
      if (error) throw error;

      const averages: Record<string, number> = {};
      for (const row of data ?? []) {
        // get_category_spend returns categories by id + a "slug"-free shape
        // (name/icon/swatch only) — the wizard keys off slug, so this hook
        // is joined against useCategories() by the caller instead.
        if (row.category_id) averages[row.category_id] = row.total / monthsElapsed;
      }
      return { averages, monthsOfHistory: monthsElapsed };
    },
  });
}
