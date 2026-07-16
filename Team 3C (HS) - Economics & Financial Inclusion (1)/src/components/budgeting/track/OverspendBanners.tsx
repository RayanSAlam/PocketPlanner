import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { MoveMoneyModal } from "@/components/budgeting/track/MoveMoneyModal";
import { useRecordAdjustment } from "@/hooks/useBudgetAdjustments";
import { moneyAbs } from "@/lib/format";
import type { BudgetProgressRow } from "@/hooks/useBudgetProgress";

export function OverspendBanners({ rows }: { rows: BudgetProgressRow[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [moveMoneyTarget, setMoveMoneyTarget] = useState<BudgetProgressRow | null>(null);

  const overspent = rows.filter((r) => r.remaining < 0 && !dismissed.has(r.line_id));
  if (overspent.length === 0) return null;

  return (
    <div className="space-y-2">
      {overspent.map((row) => (
        <OverspendBanner
          key={row.line_id}
          row={row}
          onCoverFromAnother={() => setMoveMoneyTarget(row)}
          onDismiss={() => setDismissed((prev) => new Set(prev).add(row.line_id))}
        />
      ))}
      <MoveMoneyModal targetRow={moveMoneyTarget} rows={rows} onClose={() => setMoveMoneyTarget(null)} />
    </div>
  );
}

function OverspendBanner({ row, onCoverFromAnother, onDismiss }: { row: BudgetProgressRow; onCoverFromAnother: () => void; onDismiss: () => void }) {
  const recordAdjustment = useRecordAdjustment();
  const [increaseAmount, setIncreaseAmount] = useState(Math.abs(row.remaining));

  const handleIncrease = async () => {
    try {
      await recordAdjustment.mutateAsync({ type: "increase", budgetLineId: row.line_id, amount: increaseAmount });
      toast.success(`Increased ${row.category_name} by ${moneyAbs(increaseAmount)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't increase that budget");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-gold/40 bg-gold-tint px-4 py-3">
      <p className="text-sm text-foreground">
        <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5 text-gold-foreground" />
        <span className="font-medium">{row.category_name}</span> is {moneyAbs(row.remaining)} over budget this month.
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCoverFromAnother}>
          Cover from another category
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Increase this budget
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 space-y-2.5">
            <p className="text-xs text-muted-foreground">Add to {row.category_name}'s budget</p>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                step={5}
                value={increaseAmount}
                onChange={(e) => setIncreaseAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="h-8 pl-5 font-mono-data text-sm"
              />
            </div>
            <Button size="sm" className="w-full" onClick={handleIncrease} disabled={increaseAmount <= 0 || recordAdjustment.isPending}>
              Confirm
            </Button>
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={onDismiss}>
          Leave it
        </Button>
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
