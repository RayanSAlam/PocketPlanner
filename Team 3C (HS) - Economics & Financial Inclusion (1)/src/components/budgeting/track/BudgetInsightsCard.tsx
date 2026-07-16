import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { useCachedInsights, useAnalyzeBudget } from "@/hooks/useBudgetInsights";
import { useUpdateBudgetLine } from "@/hooks/useBudgetLines";
import { moneyAbs } from "@/lib/format";
import type { BudgetProgressRow } from "@/hooks/useBudgetProgress";
import type { BudgetInsight } from "@/lib/budgeting/heuristicInsights";

const ICON = { win: TrendingUp, warning: AlertTriangle, suggestion: Lightbulb } as const;
const ICON_COLOR = { win: "text-primary", warning: "text-destructive", suggestion: "text-gold-foreground" } as const;

const COOLDOWN_MS = 60 * 60 * 1000; // one hour — soft client-side throttle, not a security control

export function BudgetInsightsCard({ period, rows }: { period: string; rows: BudgetProgressRow[] }) {
  const { data: cached, isLoading } = useCachedInsights(period);
  const analyze = useAnalyzeBudget(
    period,
    rows.map((r) => ({ category_id: r.category_id, category_name: r.category_name, amount_budgeted: r.amount_budgeted, spent: r.spent, pct_used: r.pct_used })),
  );
  const updateLine = useUpdateBudgetLine();

  const cooldownActive = cached ? Date.now() - new Date(cached.generated_at).getTime() < COOLDOWN_MS : false;

  const handleAnalyze = async () => {
    try {
      await analyze.mutateAsync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't analyze your budget right now");
    }
  };

  const handleApply = (insight: BudgetInsight) => {
    if (!insight.action) return;
    const row = rows.find((r) => r.category_id === insight.action?.categoryId);
    if (!row) {
      toast.error("That category isn't in this month's budget anymore");
      return;
    }
    updateLine.mutate(
      { id: row.line_id, amount_budgeted: insight.action.suggested },
      {
        onSuccess: () => toast.success(`${insight.action?.categoryName} updated to ${moneyAbs(insight.action?.suggested ?? 0)}`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't apply that"),
      },
    );
  };

  const analyzeButton = (
    <Button size="sm" variant="outline" className="gap-1.5" onClick={handleAnalyze} disabled={analyze.isPending || cooldownActive || rows.length === 0}>
      {analyze.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      Analyze my budget
    </Button>
  );

  return (
    <CardShell
      icon={Sparkles}
      title="Budget Insights"
      subtitle="A quick read on what's working and what's not"
      action={
        cooldownActive ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{analyzeButton}</span>
            </TooltipTrigger>
            <TooltipContent>You can re-analyze again in a bit — no need to run this too often</TooltipContent>
          </Tooltip>
        ) : (
          analyzeButton
        )
      }
    >
      {isLoading ? (
        <EmptyRow>Loading…</EmptyRow>
      ) : !cached || cached.insights.length === 0 ? (
        <EmptyRow>{rows.length === 0 ? "Budget a few categories first, then analyze." : 'No insights yet — click "Analyze my budget" to get started.'}</EmptyRow>
      ) : (
        <ul className="space-y-3">
          {cached.insights.map((insight, i) => {
            const Icon = ICON[insight.type];
            return (
              <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
                <div className="flex items-start gap-2.5">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ICON_COLOR[insight.type]}`} />
                  <p className="text-sm text-foreground">{insight.message}</p>
                </div>
                {insight.action && (
                  <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" onClick={() => handleApply(insight)} disabled={updateLine.isPending}>
                    Apply
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}
