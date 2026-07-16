import { useMemo } from "react";
import { Gauge } from "lucide-react";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { computeSensitivity } from "@/lib/simulation/sensitivity";
import { moneyAbs } from "@/lib/format";
import type { SimulationInput } from "@/lib/simulation/types";

export function SensitivityPanel({ input }: { input: SimulationInput }) {
  const factors = useMemo(() => computeSensitivity(input), [input]);
  const maxAbs = Math.max(1, ...factors.map((f) => Math.abs(f.deltaNetWorth)));

  return (
    <CardShell icon={Gauge} title="What Matters Most" subtitle="Ending net worth impact of a small nudge to each lever">
      {factors.length === 0 ? (
        <EmptyRow>Add income, savings, or debt to see what actually moves the needle</EmptyRow>
      ) : (
        <ul className="space-y-3.5">
          {factors.map((f) => {
            const positive = f.deltaNetWorth >= 0;
            const widthPct = (Math.abs(f.deltaNetWorth) / maxAbs) * 100;
            return (
              <li key={f.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="text-foreground">{f.label}</span>
                  <span className={`font-mono-data tabular-nums ${positive ? "text-primary" : "text-destructive"}`}>
                    {positive ? "+" : "-"}
                    {moneyAbs(f.deltaNetWorth)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full rounded-full ${positive ? "bg-primary" : "bg-destructive"}`} style={{ width: `${widthPct}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}
