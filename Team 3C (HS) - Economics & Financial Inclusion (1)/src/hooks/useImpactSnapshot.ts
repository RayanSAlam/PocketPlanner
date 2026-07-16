import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Fires record_impact_snapshot() once per app session (mounted alongside
// useImpactSettings() in AppShell.tsx) so Financial Progress has a fresh
// net-worth/savings-rate/DTI data point to chart. The RPC upserts on
// (user_id, snapshot_date), so it's safe to call more than once in the
// same day — the ref guard below just avoids a redundant call from
// React 18 StrictMode's dev-only double-invoke, not a correctness need.
export function useImpactSnapshot(): void {
  const { session } = useAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!session || firedRef.current) return;
    firedRef.current = true;
    supabase.rpc("record_impact_snapshot").then(({ error }) => {
      if (error) console.warn("[impact] record_impact_snapshot failed:", error.message);
    });
  }, [session]);
}
