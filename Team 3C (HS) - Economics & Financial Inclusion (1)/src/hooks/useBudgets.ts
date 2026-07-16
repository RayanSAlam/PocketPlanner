import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { currentPeriod } from "@/lib/budgeting/period";

// Quick-set from the Charts page's "Budget vs Actual" card — get-or-create
// the current month's budget header, then upsert one line on it. The full
// Plan tab (Budgeting page) has its own richer hooks for editing an entire
// grid at once; this stays minimal since it only ever sets one category.
export function useSetBudget() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ categoryId, monthlyLimit }: { categoryId: string; monthlyLimit: number }) => {
      if (!session) throw new Error("Not authenticated");
      const period = currentPeriod();

      const { data: existingBudget, error: findError } = await supabase
        .from("budgets")
        .select("id")
        .eq("period", period)
        .maybeSingle();
      if (findError) throw findError;

      let budgetId = existingBudget?.id;
      if (!budgetId) {
        const { data: created, error: createError } = await supabase
          .from("budgets")
          .insert({ user_id: session.user.id, period, method: "custom", status: "active" })
          .select("id")
          .single();
        if (createError) throw createError;
        budgetId = created.id;
      }

      const { error } = await supabase
        .from("budget_lines")
        .upsert(
          { user_id: session.user.id, budget_id: budgetId, category_id: categoryId, amount_budgeted: monthlyLimit, updated_at: new Date().toISOString() },
          { onConflict: "budget_id,category_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart", "budget-vs-actual"] });
      queryClient.invalidateQueries({ queryKey: ["chart", "spending-trend"] });
      queryClient.invalidateQueries({ queryKey: ["budget-progress"] });
    },
  });
}
