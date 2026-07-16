import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyRow } from "@/components/dashboard/CardShell";
import { BudgetSetupWizard } from "@/components/budgeting/wizard/BudgetSetupWizard";
import { BudgetGrid } from "@/components/budgeting/plan/BudgetGrid";
import { MonthSwitcher } from "@/components/budgeting/plan/MonthSwitcher";
import { TrackTabContent } from "@/components/budgeting/track/TrackTabContent";
import { GoalGrid } from "@/components/budgeting/goals/GoalGrid";
import { useBudgetPeriod, useCopyFromPeriod } from "@/hooks/useBudgetPeriod";
import { useBudgetProgress } from "@/hooks/useBudgetProgress";
import { currentPeriod, shiftPeriod } from "@/lib/budgeting/period";
import { formatMonthYear } from "@/lib/format";

const VALID_TABS = ["plan", "track", "goals"] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function BudgetingPage() {
  const [searchParams] = useSearchParams();
  const [period, setPeriod] = useState(currentPeriod());
  const requestedTab = searchParams.get("tab");
  const initialTab: TabValue = VALID_TABS.includes(requestedTab as TabValue) ? (requestedTab as TabValue) : "plan";
  const [tab, setTab] = useState<TabValue>(initialTab);
  const { data: budget, isLoading: budgetLoading } = useBudgetPeriod(period);
  const { data: progress = [], isLoading: progressLoading } = useBudgetProgress(period);
  const copyFromPeriod = useCopyFromPeriod();

  const handleCopyLastMonth = async () => {
    try {
      await copyFromPeriod.mutateAsync(shiftPeriod(period, -1));
      toast.success(`Copied ${formatMonthYear(shiftPeriod(period, -1))}'s budget to ${formatMonthYear(period)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nothing to copy from last month");
    }
  };

  if (budgetLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!budget && period === currentPeriod()) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-10 md:px-8">
        <BudgetSetupWizard onComplete={() => setTab("track")} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 md:space-y-8 md:px-8 md:py-8">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono-data mb-1 text-[11px] uppercase tracking-[0.12em] text-primary">Budgeting</p>
            <h1 className="font-display text-2xl text-foreground md:text-3xl">Plan, track, and hit your targets</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Your actual spending fills in automatically — no re-entry needed.
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="plan" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Plan
            </TabsTrigger>
            <TabsTrigger value="track" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Track
            </TabsTrigger>
            <TabsTrigger value="goals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Goals
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="plan" className="mt-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MonthSwitcher period={period} onChange={setPeriod} />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyLastMonth} disabled={copyFromPeriod.isPending}>
              <Copy className="h-3.5 w-3.5" /> Copy last month
            </Button>
          </div>

          {progressLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : budget ? (
            <BudgetGrid budget={budget} rows={progress} />
          ) : (
            <div className="rounded-[var(--radius)] border border-border bg-card">
              <EmptyRow>No budget for {formatMonthYear(period)} yet — try "Copy last month" or switch to a month with one.</EmptyRow>
            </div>
          )}
        </TabsContent>

        <TabsContent value="track" className="mt-0">
          <TrackTabContent />
        </TabsContent>

        <TabsContent value="goals" className="mt-0">
          <GoalGrid />
        </TabsContent>
      </Tabs>
    </div>
  );
}
