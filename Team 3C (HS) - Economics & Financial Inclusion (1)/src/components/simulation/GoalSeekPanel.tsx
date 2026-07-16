import { useState } from "react";
import { Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardShell } from "@/components/dashboard/CardShell";
import { NumberField } from "@/components/simulation/NumberField";
import { solveForMonthlySavings, type GoalSeekResult } from "@/lib/simulation/goalSeek";
import { moneyAbs } from "@/lib/format";
import type { SimulationInput } from "@/lib/simulation/types";

export function GoalSeekPanel({ input }: { input: SimulationInput }) {
  const [targetNetWorth, setTargetNetWorth] = useState(1_000_000);
  const [targetYear, setTargetYear] = useState(Math.min(20, input.settings.horizonYears));
  const [result, setResult] = useState<GoalSeekResult | null>(null);
  const [solving, setSolving] = useState(false);

  const handleSolve = () => {
    setSolving(true);
    // Deferred a tick so the "Solving…" state actually paints before the
    // ~30-iteration binary search (a handful of engine runs) blocks briefly.
    setTimeout(() => {
      setResult(solveForMonthlySavings(input, targetNetWorth, targetYear));
      setSolving(false);
    }, 10);
  };

  return (
    <CardShell icon={Target} title="Goal Seek" subtitle="Back-solve the savings rate you'd need to hit a target">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="goal-target-net-worth" label="Target net worth" value={targetNetWorth} onChange={setTargetNetWorth} prefix="$" step={10000} />
          <NumberField id="goal-target-year" label="By year" value={targetYear} onChange={setTargetYear} min={1} step={1} />
        </div>
        <Button onClick={handleSolve} disabled={solving} className="w-full gap-2 bg-gradient-to-r from-primary to-gold text-primary-foreground hover:opacity-90">
          {solving && <Loader2 className="h-4 w-4 animate-spin" />}
          Solve
        </Button>

        {result && !solving && (
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
            {result.achievable ? (
              result.requiredAdditionalMonthlyContribution === 0 ? (
                <p className="text-foreground">You're already on track to hit {moneyAbs(targetNetWorth)} by year {targetYear} with your current inputs.</p>
              ) : (
                <p className="text-foreground">
                  Save an extra <span className="font-mono-data font-semibold text-primary">{moneyAbs(result.requiredAdditionalMonthlyContribution)}</span> per month
                  (spread across your accounts) to reach {moneyAbs(targetNetWorth)} by year {targetYear}.
                </p>
              )
            ) : (
              <p className="text-destructive">
                Even an extra {moneyAbs(result.requiredAdditionalMonthlyContribution)}/month doesn't get there by year {targetYear} — try a later year or a lower target.
              </p>
            )}
          </div>
        )}
      </div>
    </CardShell>
  );
}
