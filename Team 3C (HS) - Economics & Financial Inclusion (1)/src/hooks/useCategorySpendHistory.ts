import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Plan tab per-row sparkline — last 6 months' spend for one category.
export function useCategorySpendHistory(categoryId: string, months = 6) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["budgeting", "category-spend-history", categoryId, months],
    enabled: !!session && !!categoryId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("category_spend_history", { p_category_id: categoryId, p_months: months });
      if (error) throw error;
      return data;
    },
  });
}

export function useSinkingFundProgress(categoryId: string, enabled: boolean) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["budgeting", "sinking-fund", categoryId],
    enabled: !!session && !!categoryId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sinking_fund_progress", { p_category_id: categoryId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}
