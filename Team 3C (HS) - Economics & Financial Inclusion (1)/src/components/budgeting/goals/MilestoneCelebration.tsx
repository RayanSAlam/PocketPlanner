import { useEffect, useMemo } from "react";
import { PartyPopper } from "lucide-react";

export interface MilestoneTrigger {
  goalName: string;
  milestone: number;
}

const CONFETTI_COLORS = ["hsl(var(--primary))", "hsl(var(--gold))", "hsl(var(--destructive))"];

// Hand-rolled — no confetti library for something this small. Fires a brief
// overlay burst + message, auto-dismisses itself via onDone.
export function MilestoneCelebration({ trigger, onDone }: { trigger: MilestoneTrigger | null; onDone: () => void }) {
  useEffect(() => {
    if (!trigger) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [trigger, onDone]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        left: `${Math.round((i / 24) * 100 + (Math.random() * 6 - 3))}%`,
        delay: `${Math.random() * 0.3}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 5 + Math.round(Math.random() * 4),
      })),
    [trigger],
  );

  if (!trigger) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-live="polite">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 animate-confetti-fall rounded-sm"
          style={{ left: p.left, width: p.size, height: p.size, backgroundColor: p.color, animationDelay: p.delay }}
        />
      ))}
      <div className="absolute left-1/2 top-8 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-gold px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg">
        <PartyPopper className="h-4 w-4" />
        {trigger.goalName} hit {trigger.milestone}%!
      </div>
    </div>
  );
}
