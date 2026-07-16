// Closed event vocabulary for the Impact Measurement tracking layer. This
// list — not a DB check constraint (impact_events.event_name is plain
// text) — is the source of truth for what's a valid event, so adding a
// new one is a frontend change, not a migration.
export const IMPACT_EVENT_NAMES = [
  "sim_panel_opened",
  "sim_chart_rendered",
  "sim_validation_error",
  "sim_calc_error",
  "sim_advanced_feature_used",
  "sim_survey_shown",
  "sim_survey_response",
  "simulation_completed",
  "scenario_marked_as_plan",
] as const;

export type ImpactEventName = (typeof IMPACT_EVENT_NAMES)[number];

// metadata.feature values for a "sim_advanced_feature_used" event —
// mirrors the Simulator's actual advanced-feature surface (see
// src/components/simulation/): Monte Carlo, goal-seek, scenario compare,
// life events, sensitivity.
export type AdvancedFeature = "monte_carlo" | "goal_seek" | "scenario_compare" | "life_events" | "sensitivity";
