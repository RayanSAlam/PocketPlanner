import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

export type NotificationSettings = Database["public"]["Tables"]["notification_settings"]["Row"];

export function useNotificationSettings() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["budgeting", "notification-settings", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Same self-heal pattern as useAccounts — everyone gets defaults on
  // first read rather than needing a signup-time trigger for a brand new
  // table added well after the original signup flow existed.
  useEffect(() => {
    if (!session || !query.isSuccess || query.data) return;
    supabase
      .from("notification_settings")
      .insert({ user_id: session.user.id })
      .then(({ error }) => {
        if (!error) queryClient.invalidateQueries({ queryKey: ["budgeting", "notification-settings", session.user.id] });
      });
  }, [session, query.isSuccess, query.data, queryClient]);

  return query;
}

type SettingsPatch = Partial<Pick<NotificationSettings, "category_alerts_enabled" | "threshold_80_enabled" | "threshold_100_enabled" | "weekly_summary_enabled" | "unusual_transaction_enabled">>;

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & SettingsPatch) => {
      const { error } = await supabase.from("notification_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgeting", "notification-settings"] });
    },
  });
}
