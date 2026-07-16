import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { EmptyRow } from "@/components/dashboard/CardShell";
import { GoalCard } from "@/components/budgeting/goals/GoalCard";
import { CreateGoalDialog } from "@/components/budgeting/goals/CreateGoalDialog";
import { GoalDetailSheet } from "@/components/budgeting/goals/GoalDetailSheet";
import { MilestoneCelebration, type MilestoneTrigger } from "@/components/budgeting/goals/MilestoneCelebration";
import { useGoals, type GoalRow } from "@/hooks/useGoals";

export function GoalGrid() {
  const { data: goals = [], isLoading } = useGoals();
  const [openGoal, setOpenGoal] = useState<GoalRow | null>(null);
  const [celebration, setCelebration] = useState<MilestoneTrigger | null>(null);

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg text-foreground">Goals</h2>
          <p className="text-sm text-muted-foreground">Savings targets and debt payoff, tracked over time</p>
        </div>
        <CreateGoalDialog
          trigger={
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-gold px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> New goal
            </button>
          }
        />
      </div>

      {goals.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-card">
          <EmptyRow>
            <Target className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            No goals yet — create one to start tracking a savings target or a payoff.
          </EmptyRow>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onOpen={() => setOpenGoal(goal)}
              onMilestone={(milestone) => setCelebration({ goalName: goal.name, milestone })}
            />
          ))}
        </div>
      )}

      <GoalDetailSheet goal={openGoal} onClose={() => setOpenGoal(null)} />
      <MilestoneCelebration trigger={celebration} onDone={() => setCelebration(null)} />
    </div>
  );
}
