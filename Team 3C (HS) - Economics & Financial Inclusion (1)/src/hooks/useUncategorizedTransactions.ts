import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { periodEnd } from "@/lib/budgeting/period";

export function useUncategorizedTransactions(period: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["budgeting", "uncategorized", period],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .is("category_id", null)
        .is("deleted_at", null)
        .gte("tx_date", period)
        .lte("tx_date", periodEnd(period))
        .order("tx_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
