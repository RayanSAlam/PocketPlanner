import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { computePaceStatus } from "@/lib/budgeting/pace";
import { daysInMonth, dayOfMonthWithin } from "@/lib/budgeting/period";
import { budgetStatusColor } from "@/components/charts/chartPalette";
import { getCategoryIcon } from "@/lib/categories";
import { moneyAbs } from "@/lib/format";
import type { BudgetProgressRow } from "@/hooks/useBudgetProgress";

export function CategoryProgressList({ rows, period, onSelect }: { rows: BudgetProgressRow[]; period: string; onSelect: (row: BudgetProgressRow) => void }) {
  const day = dayOfMonthWithin(period);
  const total = daysInMonth(period);

  return (
    <CardShell icon={TrendingUp} title="Category progress" subtitle="Tap a category to see what's in it">
      {rows.length === 0 ? (
        <EmptyRow>No budgeted categories yet — head to the Plan tab to set one up.</EmptyRow>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const Icon = getCategoryIcon(row.category_icon);
            const color = budgetStatusColor(row.pct_used);
            const pct = Math.min(100, row.pct_used);
            const pace = computePaceStatus(row.spent, row.amount_budgeted, day, total);
            return (
              <li key={row.line_id}>
                <button type="button" onClick={() => onSelect(row)} className="w-full rounded-lg text-left transition-opacity hover:opacity-80">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {row.category_name}
                    </span>
                    <span className="font-mono-data tabular-nums text-muted-foreground">
                      {moneyAbs(row.spent)} / {moneyAbs(row.amount_budgeted)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  {/* Once a category is fully (or over) spent, the bar already says
                      it clearly — a "trending X% over pace" label on top is not just
                      redundant, it's actively misleading for a fixed lump-sum expense
                      like rent, which is "100% spent" by design from day one. */}
                  {row.pct_used < 100 && <PaceLabel status={pace.status} percentOver={pace.percentOver} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}

function PaceLabel({ status, percentOver }: { status: "under" | "on-pace" | "over"; percentOver: number }) {
  if (status === "over") {
    return (
      <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
        <TrendingUp className="h-3 w-3" /> Trending {percentOver}% over
      </p>
    );
  }
  if (status === "under") {
    return (
      <p className="mt-1 flex items-center gap-1 text-[11px] text-primary">
        <TrendingDown className="h-3 w-3" /> Under pace
      </p>
    );
  }
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
      <Minus className="h-3 w-3" /> On pace
    </p>
  );
}
