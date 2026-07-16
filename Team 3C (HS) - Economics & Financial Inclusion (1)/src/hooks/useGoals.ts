import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type GoalRow = Database["public"]["Tables"]["goals"]["Row"];

export function useGoals() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["budgeting", "goals"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").neq("status", "archived").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export type CreateGoalInput = Omit<TablesInsert<"goals">, "user_id">;

export function useCreateGoal() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("goals")
        .insert({ ...input, user_id: session.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgeting", "goals"] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"goals">) => {
      const { error } = await supabase
        .from("goals")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgeting", "goals"] });
    },
  });
}

export function useGoalContributions(goalId: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["budgeting", "goal-contributions", goalId],
    enabled: !!session && !!goalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goal_contributions")
        .select("*")
        .eq("goal_id", goalId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export type AddContributionInput = Omit<TablesInsert<"goal_contributions">, "user_id">;

export function useAddContribution() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddContributionInput) => {
      if (!session) throw new Error("Not authenticated");
      const { error } = await supabase.from("goal_contributions").insert({ ...input, user_id: session.user.id });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["budgeting", "goal-contributions", variables.goal_id] });
      queryClient.invalidateQueries({ queryKey: ["budgeting", "goals"] });
    },
  });
}

// Goals.4 "auto-detected from transfers to a linked account" — candidates
// are positive-amount transactions on that account not already logged as
// a contribution (excluded by transaction_id, checked client-side against
// the goal's existing contributions rather than a DB constraint, since a
// user might legitimately want to re-log a transaction under rare edge
// cases and this is a suggestion list, not an enforced invariant).
export function useSyncCandidates(goalId: string, accountId: string | null) {
  const { session } = useAuth();
  const { data: existing = [] } = useGoalContributions(goalId);
  return useQuery({
    queryKey: ["budgeting", "goal-sync-candidates", goalId, accountId, existing.length],
    enabled: !!session && !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("account_id", accountId as string)
        .is("deleted_at", null)
        .gt("amount", 0)
        .order("tx_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      const alreadyLinked = new Set(existing.map((c) => c.transaction_id).filter(Boolean));
      return (data ?? []).filter((t) => !alreadyLinked.has(t.id));
    },
  });
}

export function useAddContributionsBulk() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: AddContributionInput[]) => {
      if (!session) throw new Error("Not authenticated");
      if (rows.length === 0) return;
      const { error } = await supabase.from("goal_contributions").insert(rows.map((r) => ({ ...r, user_id: session.user.id })));
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      const goalId = variables[0]?.goal_id;
      if (goalId) queryClient.invalidateQueries({ queryKey: ["budgeting", "goal-contributions", goalId] });
      queryClient.invalidateQueries({ queryKey: ["budgeting", "goals"] });
    },
  });
}
