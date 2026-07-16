import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAccounts() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["accounts", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Covers the user that already existed before the 0001 signup trigger
  // was created — everyone else gets a Cash account automatically at signup.
  useEffect(() => {
    if (!session || !query.isSuccess || query.data.length > 0) return;
    supabase.rpc("ensure_default_account").then(({ error }) => {
      if (!error) queryClient.invalidateQueries({ queryKey: ["accounts", session.user.id] });
    });
  }, [session, query.isSuccess, query.data, queryClient]);

  return query;
}
