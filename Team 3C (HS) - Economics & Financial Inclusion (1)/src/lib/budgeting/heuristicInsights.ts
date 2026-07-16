export type InsightType = "win" | "warning" | "suggestion";

export interface InsightAction {
  type: "adjust_budget";
  categoryId: string;
  categoryName: string;
  suggested: number;
}

export interface BudgetInsight {
  type: InsightType;
  message: string;
  action?: InsightAction;
}

export interface InsightCategoryData {
  categoryId: string;
  categoryName: string;
  amountBudgeted: number;
  spent: number; // current period
  pctUsed: number;
  // Monthly spend history, oldest to newest, NOT including the current
  // (still-in-progress) period — used for multi-month trend detection.
  history: number[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// A cheap, honest stand-in for a real recommendation engine — every
// insight here is a plain arithmetic rule over budget-vs-actual data, no
// black box. Same aggregates-only shape whether this runs client-side
// (mock/keyless mode) or is handed to an LLM server-side — see
// supabase/functions/budget-insights for the real-AI path with an
// identical output contract.
export function computeHeuristicInsights(categories: InsightCategoryData[], totalIncome: number): BudgetInsight[] {
  const insights: BudgetInsight[] = [];

  for (const cat of categories) {
    const fullHistory = [...cat.history, cat.spent];

    // Trending over three consecutive months (current + 2 prior) — a
    // pattern worth a heads-up, not just one noisy month.
    if (fullHistory.length >= 3) {
      const lastThree = fullHistory.slice(-3);
      const overAllThree = cat.amountBudgeted > 0 && lastThree.every((s) => s > cat.amountBudgeted);
      if (overAllThree) {
        insights.push({
          type: "warning",
          message: `${cat.categoryName} has run over budget three months running — averaging ${round2(lastThree.reduce((s, v) => s + v, 0) / 3)} vs. a ${cat.amountBudgeted} budget.`,
          action: { type: "adjust_budget", categoryId: cat.categoryId, categoryName: cat.categoryName, suggested: round2(Math.max(...lastThree) * 1.05) },
        });
      }
    }

    // Subscription creep — spend climbing month over month in a
    // subscriptions-flavored category specifically (this one deserves a
    // dedicated check since "slowly growing" is exactly how subscriptions
    // sneak up, unlike a one-off overspend elsewhere).
    if (/subscri/i.test(cat.categoryName) && fullHistory.length >= 3) {
      const lastThree = fullHistory.slice(-3);
      const climbing = lastThree[0] < lastThree[1] && lastThree[1] < lastThree[2];
      if (climbing) {
        insights.push({
          type: "warning",
          message: `${cat.categoryName} has crept up each of the last 3 months (${lastThree.map((v) => round2(v)).join(" → ")}) — worth a quick review for anything you're not using.`,
        });
      }
    }

    // Consistently under-used — could fund a goal faster instead of
    // sitting unused. Requires a real history (not just "this month is
    // slow"), and only flags a meaningful gap.
    if (cat.history.length >= 2 && cat.amountBudgeted > 0) {
      const allUnder = [...cat.history, cat.spent].every((s) => s < cat.amountBudgeted * 0.7);
      if (allUnder) {
        const typicalSpend = Math.max(...cat.history, cat.spent);
        const suggested = round2(Math.max(typicalSpend * 1.1, 0));
        const freed = round2(cat.amountBudgeted - suggested);
        if (freed > 0) {
          insights.push({
            type: "suggestion",
            message: `${cat.categoryName} has used well under its budget for a while — trimming it to ${suggested} would free up ${freed}/mo for savings or a goal.`,
            action: { type: "adjust_budget", categoryId: cat.categoryId, categoryName: cat.categoryName, suggested },
          });
        }
      }
    }

    // A calm, single-month "you're doing fine here" — capped below so
    // this doesn't crowd out the more useful warnings/suggestions.
    if (cat.amountBudgeted > 0 && cat.pctUsed < 70 && cat.pctUsed > 0) {
      insights.push({ type: "win", message: `${cat.categoryName} is comfortably under budget this month (${Math.round(cat.pctUsed)}% used).` });
    }
  }

  const priority: Record<InsightType, number> = { warning: 0, suggestion: 1, win: 2 };
  insights.sort((a, b) => priority[a.type] - priority[b.type]);

  // At most one "win" (avoid noise) and no more than 5 total, per spec.
  const wins = insights.filter((i) => i.type === "win").slice(0, 1);
  const rest = insights.filter((i) => i.type !== "win");
  return [...rest, ...wins].slice(0, 5);
}
