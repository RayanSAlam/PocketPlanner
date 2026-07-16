import { useState } from "react";
import { Loader2, Info, X } from "lucide-react";
import { EmptyRow } from "@/components/dashboard/CardShell";
import { SafeToSpendHero } from "@/components/budgeting/track/SafeToSpendHero";
import { CategoryProgressList } from "@/components/budgeting/track/CategoryProgressList";
import { CategoryDrilldown } from "@/components/budgeting/track/CategoryDrilldown";
import { PaceChart } from "@/components/budgeting/track/PaceChart";
import { OverspendBanners } from "@/components/budgeting/track/OverspendBanners";
import { BudgetChangelog } from "@/components/budgeting/track/BudgetChangelog";
import { BudgetInsightsCard } from "@/components/budgeting/track/BudgetInsightsCard";
import { UncategorizedPill } from "@/components/budgeting/track/UncategorizedPill";
import { useBudgetPeriod } from "@/hooks/useBudgetPeriod";
import { useBudgetProgress, type BudgetProgressRow } from "@/hooks/useBudgetProgress";
import { currentPeriod } from "@/lib/budgeting/period";

export function TrackTabContent() {
  const period = currentPeriod();
  const { data: budget, isLoading: budgetLoading } = useBudgetPeriod(period);
  const { data: rows = [], isLoading: rowsLoading } = useBudgetProgress(period);
  const [drilldownRow, setDrilldownRow] = useState<BudgetProgressRow | null>(null);
  const [midMonthNoticeDismissed, setMidMonthNoticeDismissed] = useState(false);

  if (budgetLoading || rowsLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card">
        <EmptyRow>No active budget for this month yet — set one up in the Plan tab first.</EmptyRow>
      </div>
    );
  }

  // A budget set up on, say, the 14th still reports the WHOLE month's
  // spend-to-date (day 1 through today) — that's correct, but worth a
  // one-time heads-up so early numbers don't look alarmingly high.
  const createdMidMonth = new Date(budget.created_at).getDate() > 3;

  return (
    <div className="space-y-6">
      {createdMidMonth && !midMonthNoticeDismissed && (
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-secondary/40 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-foreground">
            <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            This budget started partway through the month — "Spent" includes everything from day 1, not just since you set it up.
          </span>
          <button type="button" aria-label="Dismiss" onClick={() => setMidMonthNoticeDismissed(true)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <UncategorizedPill period={period} />
      <SafeToSpendHero rows={rows} period={period} />
      <OverspendBanners rows={rows} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <CategoryProgressList rows={rows} period={period} onSelect={setDrilldownRow} />
        <PaceChart period={period} />
      </div>
      <BudgetInsightsCard period={period} rows={rows} />
      <BudgetChangelog budgetId={budget.id} rows={rows} />
      <CategoryDrilldown row={drilldownRow} period={period} onClose={() => setDrilldownRow(null)} />
    </div>
  );
}
