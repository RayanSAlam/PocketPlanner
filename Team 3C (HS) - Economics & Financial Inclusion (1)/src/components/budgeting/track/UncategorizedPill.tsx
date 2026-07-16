import { useState } from "react";
import { AlertCircle, X, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CategorySelect } from "@/components/transactions/CategorySelect";
import { useUncategorizedTransactions } from "@/hooks/useUncategorizedTransactions";
import { useRecategorizeTransaction } from "@/hooks/useTransactions";
import { moneyAbs, formatDate } from "@/lib/format";

export function UncategorizedPill({ period }: { period: string }) {
  const { data: transactions = [] } = useUncategorizedTransactions(period);
  const [dismissed, setDismissed] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);

  if (dismissed || transactions.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-full border border-border bg-secondary/40 px-4 py-2 text-sm">
        <button type="button" onClick={() => setTriageOpen(true)} className="flex items-center gap-2 text-foreground hover:underline">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          {transactions.length} uncategorized transaction{transactions.length === 1 ? "" : "s"} aren't counted in your budget
        </button>
        <button type="button" aria-label="Dismiss" onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <TriageModal open={triageOpen} onClose={() => setTriageOpen(false)} transactions={transactions} />
    </>
  );
}

function TriageModal({
  open,
  onClose,
  transactions,
}: {
  open: boolean;
  onClose: () => void;
  transactions: { id: string; description: string; merchant_raw: string | null; amount: number; tx_date: string; category_id: string | null }[];
}) {
  const [index, setIndex] = useState(0);
  const recategorize = useRecategorizeTransaction();

  const current = transactions[index];
  const isLast = index >= transactions.length - 1;

  const advance = () => {
    if (isLast) {
      onClose();
      setIndex(0);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleAssign = (categoryId: string | null) => {
    if (!current || !categoryId) return;
    recategorize.mutate(
      { id: current.id, categoryId },
      {
        onSuccess: advance,
        onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't categorize that transaction"),
      },
    );
  };

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-sm"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") advance();
          if (e.key === "ArrowLeft" && index > 0) setIndex((i) => i - 1);
        }}
      >
        <DialogHeader>
          <DialogTitle>Quick categorize</DialogTitle>
          <DialogDescription>
            {index + 1} of {transactions.length} — use the arrow keys to skip around
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-[var(--radius)] border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{current.description || current.merchant_raw || "Transaction"}</p>
            <span className="font-mono-data text-sm text-foreground">{moneyAbs(current.amount)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(current.tx_date)}</p>
          <CategorySelect value={current.category_id} onChange={handleAssign} className="h-9" />
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={advance}>
            Skip <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
