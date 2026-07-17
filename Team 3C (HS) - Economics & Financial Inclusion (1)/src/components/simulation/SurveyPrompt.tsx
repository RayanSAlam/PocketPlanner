import { useState } from "react";
import { Star, X } from "lucide-react";
import { trackEvent } from "@/lib/impact/trackEvent";
import { cn } from "@/lib/utils";

// The Experience Quality Impact micro-survey — feeds
// get_experience_quality_inputs' avg_survey_rating (see
// supabase/migrations/0009_impact_measurement.sql). Rendered only when
// useSurveyEligibility() says so (opt-out + 14-day rate limit already
// enforced there), and trackEvent() itself is a further, independent
// no-op if the user has opted out of behavioral tracking — belt and
// suspenders on respecting that setting.
export function SurveyPrompt({ onDismiss }: { onDismiss: () => void }) {
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = (value: number) => {
    setRating(value);
    setSubmitted(true);
    void trackEvent("sim_survey_response", { rating: value });
    setTimeout(onDismiss, 1800);
  };

  const displayed = hovered ?? rating ?? 0;

  return (
    <div
      role="dialog"
      aria-label="Simulation feedback"
      className="fixed bottom-5 right-5 z-40 w-72 animate-in fade-in slide-in-from-bottom-2 rounded-[var(--radius)] border border-border bg-card p-4 shadow-lg"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {submitted ? (
        <p className="pr-4 text-sm text-foreground">Thanks for the feedback!</p>
      ) : (
        <>
          <p className="mb-3 pr-4 text-sm font-medium text-foreground">Was this simulation helpful?</p>
          <div className="flex gap-1" onMouseLeave={() => setHovered(null)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHovered(n)}
                onClick={() => submit(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                className="p-0.5"
              >
                <Star className={cn("h-5 w-5 transition-colors", displayed >= n ? "fill-gold text-gold" : "text-muted-foreground")} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
