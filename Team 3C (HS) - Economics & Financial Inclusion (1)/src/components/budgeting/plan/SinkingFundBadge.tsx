import { useState } from "react";
import { PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSinkingFundProgress } from "@/hooks/useCategorySpendHistory";
import { useUpdateBudgetLine } from "@/hooks/useBudgetLines";
import { moneyAbs } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SinkingFundBadgeProps {
  lineId: string;
  categoryId: string;
  categoryName: string;
  targetAnnual: number | null;
}

// A "sinking fund" is an annual/irregular expense (car insurance, gifts)
// budgeted as a monthly set-aside toward a once-a-year total, rather than
// a category you spend evenly every month.
export function SinkingFundBadge({ lineId, categoryId, categoryName, targetAnnual }: SinkingFundBadgeProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(targetAnnual ?? 0);
  const updateLine = useUpdateBudgetLine();
  const { data: progress } = useSinkingFundProgress(categoryId, !!targetAnnual && open);

  const handleSave = () => {
    updateLine.mutate(
      { id: lineId, sinking_fund_target_annual: draft > 0 ? draft : null },
      {
        onSuccess: () => {
          toast.success(draft > 0 ? `${categoryName} is now a sinking fund` : `Removed sinking fund from ${categoryName}`);
          setOpen(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't update that"),
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(targetAnnual ?? 0); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={targetAnnual ? `${categoryName} is a sinking fund` : `Set up ${categoryName} as a sinking fund`}
          className={cn("flex h-6 w-6 items-center justify-center rounded-full transition-colors", targetAnnual ? "bg-gold/15 text-gold" : "text-muted-foreground/40 hover:text-muted-foreground")}
        >
          <PiggyBank className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Sinking fund</p>
          <p className="text-xs text-muted-foreground">Set an annual target and we'll suggest a monthly set-aside.</p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Annual target</label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <Input type="number" min={0} step={25} value={draft} onChange={(e) => setDraft(Math.max(0, parseFloat(e.target.value) || 0))} className="h-8 pl-5 font-mono-data text-sm" />
          </div>
        </div>
        {draft > 0 && (
          <p className="text-xs text-muted-foreground">
            Suggested monthly set-aside: <span className="font-mono-data font-medium text-foreground">{moneyAbs(draft / 12)}</span>
          </p>
        )}
        {targetAnnual && progress && (
          <div className="space-y-1.5 rounded-lg bg-secondary/50 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Accumulated this year</span>
              <span className="font-mono-data text-foreground">{moneyAbs(progress.accumulated)}</span>
            </div>
            <Progress value={Math.min(100, (progress.accumulated / (progress.target_annual || 1)) * 100)} className="h-1.5" />
          </div>
        )}
        <Button size="sm" className="w-full" onClick={handleSave} disabled={updateLine.isPending}>
          {draft > 0 ? "Save" : "Remove sinking fund"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
