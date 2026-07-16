import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { setTrackingEnabledCache } from "@/lib/impact/trackEvent";
import type { Database } from "@/integrations/supabase/types";

export type ImpactSettings = Database["public"]["Tables"]["impact_settings"]["Row"];

// Kept separate from useNotificationSettings on purpose — see 0009's
// impact_settings comment: "alert me about my budget" and "collect usage
// data about me" are different consent categories.
export function useImpactSettings() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["impact", "settings", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("impact_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Same self-heal pattern as notification_settings — everyone gets a
  // default (tracking-enabled) row on first read rather than needing a
  // signup-time trigger for a table added long after the signup flow.
  useEffect(() => {
    if (!session || !query.isSuccess || query.data) return;
    supabase
      .from("impact_settings")
      .insert({ user_id: session.user.id })
      .then(({ error }) => {
        if (!error) queryClient.invalidateQueries({ queryKey: ["impact", "settings", session.user.id] });
      });
  }, [session, query.isSuccess, query.data, queryClient]);

  // trackEvent runs outside React (event handlers, effects in other
  // components) and can't read this query directly — mirror the latest
  // known value into its module-level cache whenever it changes.
  useEffect(() => {
    if (query.data) setTrackingEnabledCache(query.data.behavioral_tracking_enabled);
  }, [query.data]);

  return query;
}

export function useUpdateImpactSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, behavioral_tracking_enabled }: { id: string; behavioral_tracking_enabled: boolean }) => {
      const { error } = await supabase
        .from("impact_settings")
        .update({ behavioral_tracking_enabled, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impact", "settings"] });
    },
  });
}
