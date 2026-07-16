import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { TablesInsert } from "@/integrations/supabase/types";
import { upsertMerchantRule } from "@/lib/merchant";

export type TransactionInsertRow = Omit<TablesInsert<"transactions">, "user_id">;

export function useTransactions(limit = 20) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["transactions", "list", limit],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, category:categories(name, icon, swatch)")
        .is("deleted_at", null)
        .order("tx_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useInsertTransaction() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (row: TransactionInsertRow) => {
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...row, user_id: session.user.id })
        .select()
        .single();
      if (error) throw error;
      if (row.merchant_normalized && row.category_id) {
        await upsertMerchantRule(row.merchant_normalized, row.category_id);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useInsertTransactions() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: TransactionInsertRow[]) => {
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("transactions")
        .insert(rows.map((r) => ({ ...r, user_id: session.user.id })))
        .select();
      if (error) throw error;
      await Promise.all(
        rows
          .filter((r) => r.merchant_normalized && r.category_id)
          .map((r) => upsertMerchantRule(r.merchant_normalized as string, r.category_id as string)),
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// Track tab's category drill-down — every transaction that landed in one
// category's budget line for one period.
export function useTransactionsInRange(categoryId: string, start: string, end: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["transactions", "range", categoryId, start, end],
    enabled: !!session && !!categoryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("category_id", categoryId)
        .is("deleted_at", null)
        .gte("tx_date", start)
        .lte("tx_date", end)
        .order("tx_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Recategorizing a transaction changes which budget line's "spent" it
// counts toward, so it has to invalidate budgeting + chart queries too,
// not just the transactions list itself.
export function useRecategorizeTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string | null }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ category_id: categoryId, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budgeting"] });
      queryClient.invalidateQueries({ queryKey: ["chart"] });
    },
  });
}

export function useDistinctMerchants() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["transactions", "merchants"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("merchant_normalized")
        .not("merchant_normalized", "is", null)
        .is("deleted_at", null)
        .limit(500);
      if (error) throw error;
      const set = new Set((data ?? []).map((r) => r.merchant_normalized as string));
      return Array.from(set).sort();
    },
  });
}
