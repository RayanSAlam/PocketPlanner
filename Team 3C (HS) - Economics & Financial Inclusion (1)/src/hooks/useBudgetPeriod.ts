import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database, TablesInsert } from "@/integrations/supabase/types";

export type BudgetRow = Database["public"]["Tables"]["budgets"]["Row"];

// The budgets header row for one month — null means no budget exists yet
// for that period (the page should show the Setup Wizard instead).
export function useBudgetPeriod(period: string, enabled = true) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["budgeting", "period", period],
    enabled: !!session && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("period", period).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export type CreateBudgetInput = Omit<TablesInsert<"budgets">, "user_id">;

export function useCreateBudget() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("budgets")
        .insert({ ...input, user_id: session.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgeting"] });
    },
  });
}

export function useUpdateBudgetMeta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Pick<BudgetRow, "method" | "income_expected" | "status">>) => {
      const { error } = await supabase
        .from("budgets")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgeting"] });
    },
  });
}

// "Copy last month" — advances a budget one period forward, carrying its
// lines with it (see materialize_next_period in migration 0006).
export function useCopyFromPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fromPeriod: string) => {
      const { data, error } = await supabase.rpc("materialize_next_period", { p_from_period: fromPeriod });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgeting"] });
    },
  });
}
