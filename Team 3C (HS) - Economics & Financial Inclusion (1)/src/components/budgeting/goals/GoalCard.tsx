import { useEffect, useRef } from "react";
import { CircularProgress } from "@/components/budgeting/goals/CircularProgress";
import { useGoalContributions } from "@/hooks/useGoals";
import { getCategoryIcon } from "@/lib/categories";
import { moneyAbs, formatMonthYear } from "@/lib/format";
import {
  computeGoalProgress,
  computeRequiredMonthlyContribution,
  computeProjectedCompletion,
  computeAvgMonthlyContribution,
  getNewlyCrossedMilestones,
} from "@/lib/budgeting/goals";
import type { GoalRow } from "@/hooks/useGoals";

const SEEN_MILESTONES_KEY = "pp_goal_milestones_seen";

function getSeenMilestones(goalId: string): number[] {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_MILESTONES_KEY) ?? "{}");
    return all[goalId] ?? [];
  } catch {
    return [];
  }
}

function markMilestonesSeen(goalId: string, milestones: number[]) {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_MILESTONES_KEY) ?? "{}");
    all[goalId] = [...(all[goalId] ?? []), ...milestones];
    localStorage.setItem(SEEN_MILESTONES_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable — celebrations just won't dedupe across reloads, harmless.
  }
}

interface GoalCardProps {
  goal: GoalRow;
  onOpen: () => void;
  onMilestone: (milestone: number) => void;
}

export function GoalCard({ goal, onOpen, onMilestone }: GoalCardProps) {
  const { data: contributions = [], isSuccess } = useGoalContributions(goal.id);
  const Icon = getCategoryIcon(goal.icon);
  const totalContributed = contributions.reduce((s, c) => s + c.amount, 0);
  const progress = computeGoalProgress(goal, totalContributed);
  const requiredMonthly = goal.target_date ? computeRequiredMonthlyContribution(progress.remaining, goal.target_date) : null;
  const avgMonthly = computeAvgMonthlyContribution(contributions);
  const projectedIso = computeProjectedCompletion(progress.remaining, avgMonthly);

  // Fires the celebration overlay when this goal's progress crosses a new
  // milestone threshold — tracked in localStorage so it doesn't re-fire on
  // reload. The FIRST successful data load for a goal only establishes the
  // baseline (silently marks whatever's already crossed as seen, without
  // celebrating) — a goal that was already 60% done before this browser
  // ever saw it shouldn't suddenly "celebrate" 25%/50% on page load. Every
  // load after that first one celebrates genuinely new crossings.
  const hasEstablishedBaseline = useRef(false);
  useEffect(() => {
    if (!isSuccess) return;
    const seen = getSeenMilestones(goal.id);
    const previousHigh = seen.length > 0 ? Math.max(...seen) : 0;
    const newlyCrossed = getNewlyCrossedMilestones(previousHigh, progress.percent);
    if (newlyCrossed.length > 0) {
      markMilestonesSeen(goal.id, newlyCrossed);
      if (hasEstablishedBaseline.current) onMilestone(Math.max(...newlyCrossed));
    }
    hasEstablishedBaseline.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal.id, isSuccess, progress.percent]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-4 rounded-[var(--radius)] border border-border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-4">
        <CircularProgress percent={progress.percent} size={64}>
          <Icon className="h-5 w-5 text-primary" />
        </CircularProgress>
        <div className="min-w-0">
          <p className="truncate font-display text-lg text-foreground">{goal.name}</p>
          <p className="font-mono-data text-xs text-muted-foreground">{Math.round(progress.percent)}% there</p>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{goal.type === "save" ? "Saved" : "Paid off"}</span>
          <span className="font-mono-data text-foreground">
            {moneyAbs(goal.type === "save" ? progress.current : goal.starting_amount - progress.current)} / {moneyAbs(goal.type === "save" ? goal.target_amount : goal.starting_amount - goal.target_amount)}
          </span>
        </div>
        {goal.target_date && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Target date</span>
            <span className="font-mono-data text-foreground">{formatMonthYear(goal.target_date)}</span>
          </div>
        )}
      </div>

      {progress.percent < 100 && (
        <div className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          {requiredMonthly !== null && (
            <p>
              <span className="font-mono-data font-medium text-foreground">{moneyAbs(requiredMonthly)}/mo</span> to hit your target date
            </p>
          )}
          {projectedIso && (
            <p className={requiredMonthly !== null ? "mt-0.5" : ""}>
              At your current pace: <span className="font-medium text-foreground">{formatMonthYear(projectedIso)}</span>
            </p>
          )}
          {requiredMonthly === null && !projectedIso && <p>Log a contribution to see your pace</p>}
        </div>
      )}
      {progress.percent >= 100 && <p className="rounded-lg bg-primary/10 px-3 py-2 text-center text-xs font-medium text-primary">Goal complete 🎉</p>}
    </button>
  );
}
