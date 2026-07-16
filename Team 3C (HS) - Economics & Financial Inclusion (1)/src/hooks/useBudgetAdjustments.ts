import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

export type AdjustmentType = Database["public"]["Enums"]["adjustment_type"];

export function useBudgetAdjustments(budgetId: string | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["budgeting", "adjustments", budgetId],
    enabled: !!session && !!budgetId,
    queryFn: async () => {
      // budget_adjustments has no direct period column — filter through
      // the budget's own lines rather than adding a denormalized column.
      const { data: lineIds, error: lineError } = await supabase.from("budget_lines").select("id").eq("budget_id", budgetId as string);
      if (lineError) throw lineError;
      const ids = (lineIds ?? []).map((l) => l.id);
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("budget_adjustments")
        .select("*")
        .in("budget_line_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Wraps record_budget_adjustment() (migration 0007) — a single atomic RPC
// call so a "move money" action can never half-apply (line updated but no
// changelog entry, or vice versa).
export function useRecordAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: AdjustmentType; budgetLineId: string; amount: number; fromLineId?: string | null; note?: string | null }) => {
      const { data, error } = await supabase.rpc("record_budget_adjustment", {
        p_type: input.type,
        p_budget_line_id: input.budgetLineId,
        p_amount: input.amount,
        p_from_line_id: input.fromLineId ?? null,
        p_note: input.note ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgeting"] });
    },
  });
}
