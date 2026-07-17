import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Same 14-day window used elsewhere in the impact system (e.g. the
// simulation-to-action conversion lookback), kept here for consistency
// rather than a separately-tuned constant. "Eligible" means: no
// sim_survey_shown event in the last 14 days for this user — the
// micro-survey should feel occasional, never naggy.
const ELIGIBILITY_WINDOW_DAYS = 14;

export function useSurveyEligibility() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["impact", "survey-eligibility", session?.user.id],
    enabled: !!session,
    staleTime: Infinity, // one check per page load is enough — this isn't a live-updating value
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("impact_events")
        .select("client_ts")
        .eq("event_name", "sim_survey_shown")
        .order("client_ts", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return true;

      const daysSinceLastShown = (Date.now() - new Date(data.client_ts).getTime()) / 86_400_000;
      return daysSinceLastShown >= ELIGIBILITY_WINDOW_DAYS;
    },
  });
}
