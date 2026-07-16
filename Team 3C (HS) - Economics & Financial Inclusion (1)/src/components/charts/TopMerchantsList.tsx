import { List } from "lucide-react";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { useTopMerchants } from "@/hooks/useChartData";
import { moneyAbs } from "@/lib/format";
import type { DateRange } from "@/hooks/useChartData";

export function TopMerchantsList({ range }: { range: DateRange }) {
  const { data, isLoading } = useTopMerchants(range, 8);
  const rows = data ?? [];
  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <CardShell icon={List} title="Top Merchants" subtitle="Where you're spending the most">
      {isLoading ? (
        <EmptyRow>Loading…</EmptyRow>
      ) : rows.length === 0 ? (
        <EmptyRow>Upload a document or add a transaction to see this chart</EmptyRow>
      ) : (
        <ol className="space-y-3">
          {rows.map((r, i) => (
            <li key={r.merchant_normalized} className="flex items-center gap-3">
              <span className="font-mono-data w-4 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate capitalize text-foreground">{r.merchant_normalized}</span>
                  <span className="font-mono-data shrink-0 tabular-nums text-foreground">{moneyAbs(r.total)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(r.total / max) * 100}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </CardShell>
  );
}
