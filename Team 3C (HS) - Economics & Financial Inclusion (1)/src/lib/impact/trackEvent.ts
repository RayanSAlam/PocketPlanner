import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { ImpactEventName } from "./eventNames";

const SESSION_ID_KEY = "pp_impact_session_id";

// trackEvent is a plain function (called from event handlers/effects, not
// a hook), so it can't read useImpactSettings' React Query state directly.
// useImpactSettings keeps this in sync via setTrackingEnabledCache whenever
// its query resolves. Defaults to enabled (opt-out), matching the DB
// column's own `default true` — see 0009's impact_settings comment for why.
let trackingEnabled = true;

export function setTrackingEnabledCache(enabled: boolean): void {
  trackingEnabled = enabled;
}

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

// Fire-and-forget by design: instrumentation must never throw into the UI
// flow it's measuring, and never blocks the caller. No batching/queueing —
// this project's event volume doesn't warrant it yet (see README's Impact
// Measurement Phase 2 list).
export async function trackEvent(eventName: ImpactEventName, metadata: Json = {}): Promise<void> {
  if (!trackingEnabled) return;
  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return; // never track logged-out visitors — nothing to attach it to

    const { error } = await supabase.from("impact_events").insert({
      user_id: session.user.id,
      session_id: getSessionId(),
      event_name: eventName,
      metadata,
      client_ts: new Date().toISOString(),
    });
    if (error) console.warn("[impact] trackEvent failed:", eventName, error.message);
  } catch (err) {
    console.warn("[impact] trackEvent threw:", eventName, err);
  }
}
