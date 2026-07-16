import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CategorySelect } from "@/components/transactions/CategorySelect";
import { EmptyRow } from "@/components/dashboard/CardShell";
import { useTransactionsInRange, useRecategorizeTransaction } from "@/hooks/useTransactions";
import { periodEnd } from "@/lib/budgeting/period";
import { formatDate, moneyAbs } from "@/lib/format";
import type { BudgetProgressRow } from "@/hooks/useBudgetProgress";

interface CategoryDrilldownProps {
  row: BudgetProgressRow | null;
  period: string;
  onClose: () => void;
}

export function CategoryDrilldown({ row, period, onClose }: CategoryDrilldownProps) {
  const { data: transactions = [], isLoading } = useTransactionsInRange(row?.category_id ?? "", period, periodEnd(period));
  const recategorize = useRecategorizeTransaction();

  return (
    <Sheet open={!!row} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{row?.category_name}</SheetTitle>
          <SheetDescription>
            {row && (
              <>
                {moneyAbs(row.spent)} spent of {moneyAbs(row.amount_budgeted)} budgeted this month
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyRow>No transactions in this category this month.</EmptyRow>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="space-y-2 rounded-lg border border-border px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{tx.description || tx.merchant_raw || "Transaction"}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(tx.tx_date)}</p>
                  </div>
                  <span className="font-mono-data shrink-0 text-sm text-foreground">{moneyAbs(tx.amount)}</span>
                </div>
                <CategorySelect
                  value={tx.category_id}
                  onChange={(categoryId) => {
                    if (!categoryId) return;
                    recategorize.mutate(
                      { id: tx.id, categoryId },
                      {
                        onSuccess: () => toast.success("Recategorized — bars updated"),
                        onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't recategorize that transaction"),
                      },
                    );
                  }}
                  className="h-8 text-xs"
                />
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
