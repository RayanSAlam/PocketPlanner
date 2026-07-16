import { useLocation } from "react-router-dom";
import { useBudgetPeriod } from "@/hooks/useBudgetPeriod";
import { useBudgetProgress } from "@/hooks/useBudgetProgress";
import { currentPeriod, daysRemainingInMonth } from "@/lib/budgeting/period";
import { moneyAbs } from "@/lib/format";

// "You've got $84 left in Dining for 9 more days" — the mascot's one
// budget-aware nudge, picking whichever still-has-room category is
// tightest right now (smallest remaining balance), since that's the one
// most worth a heads-up. Only computed while on the Budgeting page, so
// this doesn't add a live budget query to every other page in the app.
export function useBudgetAwareTip(): string | null {
  const location = useLocation();
  const onBudgetingPage = location.pathname === "/budgeting";
  const period = currentPeriod();

  const { data: budget } = useBudgetPeriod(period, onBudgetingPage);
  const { data: rows = [] } = useBudgetProgress(period, onBudgetingPage);

  if (!onBudgetingPage || !budget || rows.length === 0) return null;

  const candidates = rows.filter((r) => r.group_name !== "Needs" && r.remaining > 0);
  if (candidates.length === 0) return null;

  const tightest = candidates.reduce((min, r) => (r.remaining < min.remaining ? r : min));
  const daysLeft = daysRemainingInMonth(period);

  return `You've got ${moneyAbs(tightest.remaining)} left in ${tightest.category_name} for ${daysLeft} more day${daysLeft === 1 ? "" : "s"} — want to check the pace chart?`;
}
