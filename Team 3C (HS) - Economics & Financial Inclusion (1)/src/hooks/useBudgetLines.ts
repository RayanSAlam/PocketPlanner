import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { markRecentEdit } from "@/lib/budgeting/recentEdits";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type AddBudgetLineInput = Omit<TablesInsert<"budget_lines">, "user_id">;

export function useAddBudgetLine() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddBudgetLineInput) => {
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("budget_lines")
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

// CSV import — bulk insert (upsert-by-category so re-importing the same
// file twice updates existing lines instead of erroring on the
// unique(budget_id, category_id) constraint).
export function useImportBudgetLines() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: AddBudgetLineInput[]) => {
      if (!session) throw new Error("Not authenticated");
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("budget_lines")
        .upsert(
          rows.map((r) => ({ ...r, user_id: session.user.id })),
          { onConflict: "budget_id,category_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgeting"] });
    },
  });
}

export function useUpdateBudgetLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"budget_lines">) => {
      const { error } = await supabase
        .from("budget_lines")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    // Optimistic: budget cell edits should feel instant, not wait a round
    // trip — the totals bar and the cell itself update immediately, then
    // reconcile silently against the real row once the mutation settles.
    onMutate: async ({ id, ...patch }) => {
      markRecentEdit(id);
      await queryClient.cancelQueries({ queryKey: ["budgeting", "progress"] });
      const previous = queryClient.getQueriesData({ queryKey: ["budgeting", "progress"] });
      queryClient.setQueriesData({ queryKey: ["budgeting", "progress"] }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((row: { line_id: string }) => (row.line_id === id ? { ...row, ...patch } : row));
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["budgeting"] });
    },
  });
}

export function useDeleteBudgetLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      markRecentEdit(id);
      const { error } = await supabase.from("budget_lines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgeting"] });
    },
  });
}
