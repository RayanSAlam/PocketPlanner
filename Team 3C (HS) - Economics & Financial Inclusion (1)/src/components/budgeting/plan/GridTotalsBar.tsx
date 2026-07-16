import { moneyAbs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BudgetMethod } from "@/lib/budgeting/methodDefaults";

interface GridTotalsBarProps {
  income: number;
  totalBudgeted: number;
  method: BudgetMethod;
}

export function GridTotalsBar({ income, totalBudgeted, method }: GridTotalsBarProps) {
  const leftToBudget = income - totalBudgeted;
  const isZeroBased = method === "zero_based";
  const balanced = Math.abs(leftToBudget) < 0.01;

  const statusColor = isZeroBased ? (balanced ? "text-primary" : "text-gold-foreground") : leftToBudget >= 0 ? "text-primary" : "text-destructive";
  const dotColor = isZeroBased ? (balanced ? "bg-primary" : "bg-gold") : leftToBudget >= 0 ? "bg-primary" : "bg-destructive";

  return (
    <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono-data text-xs text-muted-foreground">
        <span>
          Income <span className="text-foreground">{moneyAbs(income)}</span>
        </span>
        <span aria-hidden="true">−</span>
        <span>
          Budgeted <span className="text-foreground">{moneyAbs(totalBudgeted)}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", dotColor)} aria-hidden="true" />
        <span className={cn("font-mono-data text-sm font-semibold", statusColor)}>
          {isZeroBased
            ? balanced
              ? "Balanced — ready to lock in"
              : `${moneyAbs(leftToBudget)} ${leftToBudget > 0 ? "left to budget" : "over income"}`
            : `${moneyAbs(leftToBudget)} planned savings`}
        </span>
      </div>
    </div>
  );
}
