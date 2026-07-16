import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// The shared source of truth for both the Plan grid and the Track tab —
// one RPC call gets budgeted/spent/remaining/rollover/pace-relevant data
// per category line for a period. See budget_progress() in migration 0006.
export function useBudgetProgress(period: string, enabled = true) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["budgeting", "progress", period],
    enabled: !!session && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("budget_progress", { p_period: period });
      if (error) throw error;
      return data;
    },
  });
}

export type BudgetProgressRow = NonNullable<ReturnType<typeof useBudgetProgress>["data"]>[number];
