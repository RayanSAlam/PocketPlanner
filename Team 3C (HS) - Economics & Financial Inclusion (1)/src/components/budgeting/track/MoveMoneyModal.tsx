import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecordAdjustment } from "@/hooks/useBudgetAdjustments";
import { moneyAbs } from "@/lib/format";
import type { BudgetProgressRow } from "@/hooks/useBudgetProgress";

interface MoveMoneyModalProps {
  targetRow: BudgetProgressRow | null;
  rows: BudgetProgressRow[];
  onClose: () => void;
}

export function MoveMoneyModal({ targetRow, rows, onClose }: MoveMoneyModalProps) {
  const recordAdjustment = useRecordAdjustment();
  const [fromLineId, setFromLineId] = useState("");
  const [amount, setAmount] = useState(0);

  // This modal is one persistent instance reused across different overspend
  // banners (unlike OverspendBanner, which gets a fresh instance per row via
  // `key`) — targetRow changes as a PROP over time, so useState's initial
  // value alone would only ever reflect whichever row opened it first. Reset
  // whenever a new target opens.
  useEffect(() => {
    if (targetRow) {
      setAmount(Math.abs(targetRow.remaining));
      setFromLineId("");
    }
  }, [targetRow?.line_id]);

  const candidates = rows.filter((r) => r.line_id !== targetRow?.line_id && r.remaining > 0);

  const handleConfirm = async () => {
    if (!targetRow || !fromLineId || amount <= 0) return;
    try {
      await recordAdjustment.mutateAsync({ type: "move", budgetLineId: targetRow.line_id, fromLineId, amount });
      toast.success(`Moved ${moneyAbs(amount)} to ${targetRow.category_name}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't move that money");
    }
  };

  return (
    <Dialog open={!!targetRow} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cover {targetRow?.category_name} from another category</DialogTitle>
          <DialogDescription>Moves budgeted dollars, envelope-style — doesn't touch actual transactions.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-foreground">From</label>
            <Select value={fromLineId} onValueChange={setFromLineId}>
              <SelectTrigger className="mt-1.5 h-9">
                <SelectValue placeholder="Choose a category with room…" />
              </SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No categories have unspent budget right now</div>
                ) : (
                  candidates.map((c) => (
                    <SelectItem key={c.line_id} value={c.line_id}>
                      {c.category_name} — {moneyAbs(c.remaining)} left
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-foreground">Amount</label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                step={5}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="pl-6 font-mono-data"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!fromLineId || amount <= 0 || recordAdjustment.isPending}>
            Move money
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
