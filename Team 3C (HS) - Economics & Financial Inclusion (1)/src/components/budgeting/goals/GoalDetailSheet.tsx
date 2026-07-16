import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Sparkles, Archive } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyRow } from "@/components/dashboard/CardShell";
import { CircularProgress } from "@/components/budgeting/goals/CircularProgress";
import { useGoalContributions, useAddContribution, useSyncCandidates, useAddContributionsBulk, useUpdateGoal } from "@/hooks/useGoals";
import { computeGoalProgress } from "@/lib/budgeting/goals";
import { getCategoryIcon } from "@/lib/categories";
import { moneyAbs, formatDate, todayIso } from "@/lib/format";
import type { GoalRow } from "@/hooks/useGoals";

export function GoalDetailSheet({ goal, onClose }: { goal: GoalRow | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: contributions = [] } = useGoalContributions(goal?.id ?? "");
  const { data: syncCandidates = [] } = useSyncCandidates(goal?.id ?? "", goal?.linked_account_id ?? null);
  const addContribution = useAddContribution();
  const addBulk = useAddContributionsBulk();
  const updateGoal = useUpdateGoal();

  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIso());
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  if (!goal) return null;

  const Icon = getCategoryIcon(goal.icon);
  const totalContributed = contributions.reduce((s, c) => s + c.amount, 0);
  const progress = computeGoalProgress(goal, totalContributed);

  const handleLog = async () => {
    if (amount <= 0) return;
    try {
      await addContribution.mutateAsync({ goal_id: goal.id, amount, date, source: "manual" });
      toast.success(`Logged ${moneyAbs(amount)}`);
      setAmount(0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't log that contribution");
    }
  };

  const handleSync = async () => {
    const rows = syncCandidates
      .filter((t) => selectedTxIds.has(t.id))
      .map((t) => ({ goal_id: goal.id, amount: t.amount, date: t.tx_date, transaction_id: t.id, source: "auto" as const }));
    if (rows.length === 0) return;
    try {
      await addBulk.mutateAsync(rows);
      toast.success(`Added ${rows.length} contribution${rows.length === 1 ? "" : "s"} from your account`);
      setSelectedTxIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't sync those transactions");
    }
  };

  const handleArchive = async () => {
    try {
      await updateGoal.mutateAsync({ id: goal.id, status: "archived" });
      toast.success(`${goal.name} archived`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't archive that goal");
    }
  };

  const handleSimulate = () => {
    navigate("/simulation");
    toast("Try adding this as a monthly savings contribution to see the impact", { icon: <Sparkles className="h-4 w-4" /> });
  };

  return (
    <Sheet open={!!goal} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <CircularProgress percent={progress.percent} size={56}>
              <Icon className="h-4.5 w-4.5 text-primary" />
            </CircularProgress>
            <div>
              <SheetTitle>{goal.name}</SheetTitle>
              <SheetDescription>
                {goal.type === "save"
                  ? `${moneyAbs(progress.current)} of ${moneyAbs(goal.target_amount)} saved`
                  : `${moneyAbs(goal.starting_amount - progress.current)} of ${moneyAbs(goal.starting_amount - goal.target_amount)} paid off`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-6">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleSimulate}>
            <Sparkles className="h-3.5 w-3.5" /> What if I add more per month?
          </Button>

          <div className="space-y-2.5 rounded-[var(--radius)] border border-border p-3.5">
            <p className="text-sm font-medium text-foreground">Log a contribution</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))} className="h-9 pl-5 font-mono-data text-sm" />
              </div>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-36 text-sm" />
              <Button size="sm" onClick={handleLog} disabled={amount <= 0 || addContribution.isPending} className="h-9">
                {addContribution.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Log"}
              </Button>
            </div>
          </div>

          {goal.linked_account_id && syncCandidates.length > 0 && (
            <div className="space-y-2.5 rounded-[var(--radius)] border border-border p-3.5">
              <p className="text-sm font-medium text-foreground">Sync from linked account</p>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {syncCandidates.map((t) => (
                  <label key={t.id} className="flex items-center gap-2.5 rounded px-1.5 py-1 text-sm hover:bg-secondary/50">
                    <Checkbox
                      checked={selectedTxIds.has(t.id)}
                      onCheckedChange={(checked) => {
                        setSelectedTxIds((prev) => {
                          const next = new Set(prev);
                          checked ? next.add(t.id) : next.delete(t.id);
                          return next;
                        });
                      }}
                    />
                    <span className="flex-1 truncate text-foreground">{t.description || "Transaction"}</span>
                    <span className="font-mono-data text-xs text-muted-foreground">{moneyAbs(t.amount)}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(t.tx_date)}</span>
                  </label>
                ))}
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={handleSync} disabled={selectedTxIds.size === 0 || addBulk.isPending}>
                Add {selectedTxIds.size > 0 ? selectedTxIds.size : ""} as contribution{selectedTxIds.size === 1 ? "" : "s"}
              </Button>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">History</p>
            {contributions.length === 0 ? (
              <EmptyRow>No contributions logged yet.</EmptyRow>
            ) : (
              <ul className="space-y-1.5">
                {contributions.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatDate(c.date)} {c.source === "auto" && <span className="text-[10px] uppercase tracking-wide">· auto</span>}
                    </span>
                    <span className="font-mono-data text-foreground">{moneyAbs(c.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="button" onClick={handleArchive} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive">
            <Archive className="h-3.5 w-3.5" /> Archive this goal
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
