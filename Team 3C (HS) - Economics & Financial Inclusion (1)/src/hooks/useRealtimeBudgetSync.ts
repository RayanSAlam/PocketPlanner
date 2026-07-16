import { useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isRecentEdit } from "@/lib/budgeting/recentEdits";

// "Two tabs open" — last-write-wins with a toast, not a silent clobber.
// Subscribes to this budget's lines (see migration 0006's realtime
// publication) and prompts a refresh only for changes that DIDN'T
// originate from this tab's own mutations.
export function useRealtimeBudgetSync(budgetId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!budgetId) return;

    const channel = supabase
      .channel(`budget-lines-${budgetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budget_lines", filter: `budget_id=eq.${budgetId}` },
        (payload) => {
          const lineId = (payload.new as { id?: string })?.id ?? (payload.old as { id?: string })?.id;
          if (lineId && isRecentEdit(lineId)) return;

          toast("This budget was updated elsewhere", {
            description: "Someone (or another tab) changed something here.",
            action: {
              label: "Refresh",
              onClick: () => queryClient.invalidateQueries({ queryKey: ["budgeting"] }),
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [budgetId, queryClient]);
}
