import { useMemo } from "react";
import { History, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { useBudgetAdjustments } from "@/hooks/useBudgetAdjustments";
import { moneyAbs } from "@/lib/format";
import type { BudgetProgressRow } from "@/hooks/useBudgetProgress";

export function BudgetChangelog({ budgetId, rows }: { budgetId: string | undefined; rows: BudgetProgressRow[] }) {
  const { data: adjustments = [] } = useBudgetAdjustments(budgetId);
  const nameByLineId = useMemo(() => new Map(rows.map((r) => [r.line_id, r.category_name])), [rows]);

  return (
    <CardShell icon={History} title="Budget changelog" subtitle="Your own decisions, in order">
      {adjustments.length === 0 ? (
        <EmptyRow>No adjustments yet this month.</EmptyRow>
      ) : (
        <ul className="space-y-2.5">
          {adjustments.map((adj) => {
            const toName = nameByLineId.get(adj.budget_line_id) ?? "a category";
            const fromName = adj.from_line_id ? nameByLineId.get(adj.from_line_id) ?? "another category" : null;
            return (
              <li key={adj.id} className="flex items-center gap-2.5 text-sm">
                {adj.type === "move" ? (
                  <>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-foreground">
                      Moved <span className="font-mono-data">{moneyAbs(adj.amount)}</span> from {fromName} to {toName}
                    </span>
                  </>
                ) : adj.type === "increase" ? (
                  <>
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-foreground">
                      Increased {toName} by <span className="font-mono-data">{moneyAbs(adj.amount)}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3.5 w-3.5 shrink-0 text-destructive" />
                    <span className="text-foreground">
                      Decreased {toName} by <span className="font-mono-data">{moneyAbs(adj.amount)}</span>
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}
