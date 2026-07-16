import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DateRange {
  start: string; // ISO yyyy-mm-dd
  end: string;
}

export function useCategorySpend(range: DateRange, accountId: string | null) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["chart", "category-spend", range.start, range.end, accountId],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_category_spend", {
        p_start: range.start,
        p_end: range.end,
        p_account_id: accountId,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useCashFlow(range: DateRange) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["chart", "cash-flow", range.start, range.end],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cash_flow", { p_start: range.start, p_end: range.end });
      if (error) throw error;
      return data;
    },
  });
}

export function useSpendingTrend(range: DateRange) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["chart", "spending-trend", range.start, range.end],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_spending_trend", { p_start: range.start, p_end: range.end });
      if (error) throw error;
      return data;
    },
  });
}

// Superseded get_budget_vs_actual (old flat budgets table) with
// budget_progress (period-based budgets/budget_lines, see migration 0006) —
// same purpose, richer per-line shape (remaining/rollover/sinking-fund).
export function useBudgetVsActual(period: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["chart", "budget-vs-actual", period],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("budget_progress", { p_period: period });
      if (error) throw error;
      return data;
    },
  });
}

export function useTopMerchants(range: DateRange, limit = 8) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["chart", "top-merchants", range.start, range.end, limit],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_merchants", {
        p_start: range.start,
        p_end: range.end,
        p_limit: limit,
      });
      if (error) throw error;
      return data;
    },
  });
}
