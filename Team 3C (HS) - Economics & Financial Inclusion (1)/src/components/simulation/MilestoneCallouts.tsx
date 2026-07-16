import { useMemo } from "react";
import { Flag } from "lucide-react";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { detectMilestones } from "@/lib/simulation/milestones";
import type { AccountBucket, SimulationOutput } from "@/lib/simulation/types";

export function MilestoneCallouts({ output, buckets }: { output: SimulationOutput; buckets: AccountBucket[] }) {
  const milestones = useMemo(() => detectMilestones(output, buckets), [output, buckets]);

  return (
    <CardShell icon={Flag} title="Milestone Callouts" subtitle="The interesting moments in this projection, auto-detected">
      {milestones.length === 0 ? (
        <EmptyRow>Nothing notable detected yet — adjust your inputs to see milestones appear</EmptyRow>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {milestones.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-secondary/40 p-3">
              <p className="font-display text-sm text-foreground">{m.label}</p>
              <p className="font-mono-data mt-0.5 text-xs text-primary">{m.detail}</p>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}
