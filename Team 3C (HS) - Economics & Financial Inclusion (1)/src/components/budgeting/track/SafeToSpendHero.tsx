import { useMemo } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { computeSafeToSpend, computeMonthHealth, type MonthHealth } from "@/lib/budgeting/pace";
import { daysInMonth, dayOfMonthWithin, daysRemainingInMonth } from "@/lib/budgeting/period";
import { moneyAbs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BudgetProgressRow } from "@/hooks/useBudgetProgress";

const HEALTH_LABEL: Record<MonthHealth, string> = {
  green: "On track",
  amber: "Trending a bit over",
  red: "Over pace",
};

const HEALTH_RING: Record<MonthHealth, string> = {
  green: "border-primary-foreground",
  amber: "border-gold",
  red: "border-destructive",
};

export function SafeToSpendHero({ rows, period }: { rows: BudgetProgressRow[]; period: string }) {
  const { perDay, daysRemaining } = useMemo(
    () => computeSafeToSpend(rows.map((r) => ({ groupName: r.group_name, amountBudgeted: r.amount_budgeted, spent: r.spent })), daysRemainingInMonth(period)),
    [rows, period],
  );

  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const totalBudgeted = rows.reduce((s, r) => s + r.amount_budgeted, 0);
  const health = computeMonthHealth(totalSpent, totalBudgeted, dayOfMonthWithin(period), daysInMonth(period));

  return (
    <div className="relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-primary to-gold px-6 py-8 text-primary-foreground shadow-sm md:px-10 md:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20">
        <span className="absolute left-[8%] top-[20%] text-2xl">✦</span>
        <span className="absolute left-[22%] top-[65%] text-lg">✧</span>
        <span className="absolute left-[38%] top-[15%] h-2 w-2 rounded-full bg-current" />
        <span className="absolute left-[52%] top-[75%] text-xl">✦</span>
        <span className="absolute left-[65%] top-[30%] h-1.5 w-1.5 rounded-full bg-current" />
        <span className="absolute left-[80%] top-[60%] text-lg">✧</span>
      </div>

      <button
        type="button"
        onClick={() => toast("Alert preferences coming in a later build stage")}
        aria-label="Notification preferences"
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/15 text-primary-foreground transition-colors hover:bg-primary-foreground/25"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] opacity-80">Safe to spend</p>
          <p className="font-display mt-1 text-4xl md:text-5xl">{moneyAbs(perDay)}/day</p>
          <p className="mt-1 text-sm opacity-90">
            for the next {daysRemaining} day{daysRemaining === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("flex h-16 w-16 items-center justify-center rounded-full border-4 bg-primary-foreground/10", HEALTH_RING[health])}>
            <span className="text-xl">{health === "green" ? "🙂" : health === "amber" ? "😐" : "😬"}</span>
          </div>
          <div>
            <p className="text-sm font-semibold">{HEALTH_LABEL[health]}</p>
            <p className="font-mono-data text-xs opacity-80">
              {moneyAbs(totalSpent)} of {moneyAbs(totalBudgeted)} spent
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
