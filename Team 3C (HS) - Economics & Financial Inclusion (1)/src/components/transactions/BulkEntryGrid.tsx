import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { DatePicker } from "@/components/transactions/DatePicker";
import { CategorySelect } from "@/components/transactions/CategorySelect";
import { AccountSelect } from "@/components/transactions/AccountSelect";
import { useAccounts } from "@/hooks/useAccounts";
import { useInsertTransactions, type TransactionInsertRow } from "@/hooks/useTransactions";
import { normalizeMerchant } from "@/lib/merchant";
import { todayIso } from "@/lib/format";

interface BulkRow {
  id: string;
  tx_date: string;
  description: string;
  category_id: string | null;
  account_id: string;
  amount: string;
}

let rowSeq = 0;
const newRow = (accountId: string): BulkRow => ({
  id: `r${++rowSeq}`,
  tx_date: todayIso(),
  description: "",
  category_id: null,
  account_id: accountId,
  amount: "",
});

// Paste handling only fills Date / Description / Amount — the three
// columns a copy from Excel/Sheets realistically lines up with. Category
// and Account stay manual per-row selects; bulk-recategorize afterward.
type PasteColumn = "tx_date" | "description" | "amount";

export function BulkEntryGrid({ onDone }: { onDone?: () => void }) {
  const { data: accounts } = useAccounts();
  const defaultAccountId = accounts?.find((a) => a.is_default)?.id ?? accounts?.[0]?.id ?? "";
  const [rows, setRows] = useState<BulkRow[]>(() => [newRow(""), newRow(""), newRow("")]);
  const insertMany = useInsertTransactions();

  // Backfill default account id into rows once accounts load.
  if (defaultAccountId && rows.some((r) => !r.account_id)) {
    setRows((prev) => prev.map((r) => (r.account_id ? r : { ...r, account_id: defaultAccountId })));
  }

  const updateRow = (id: string, patch: Partial<BulkRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));
  const addRow = () => setRows((prev) => [...prev, newRow(defaultAccountId)]);

  const handlePaste = (startRowIndex: number, startCol: PasteColumn, e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\t") && !text.includes("\n")) return; // let a normal single-value paste through
    e.preventDefault();

    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);
    const columnOrder: PasteColumn[] = ["tx_date", "description", "amount"];
    const startColIndex = columnOrder.indexOf(startCol);

    setRows((prev) => {
      const next = [...prev];
      lines.forEach((line, i) => {
        const cells = line.split("\t");
        const rowIndex = startRowIndex + i;
        while (next.length <= rowIndex) next.push(newRow(defaultAccountId));
        const patch: Partial<BulkRow> = {};
        cells.forEach((cell, cellIdx) => {
          const col = columnOrder[startColIndex + cellIdx];
          if (!col) return;
          if (col === "tx_date") {
            const parsed = parsePastedDate(cell.trim());
            if (parsed) patch.tx_date = parsed;
          } else if (col === "amount") {
            patch.amount = cell.trim().replace(/[^0-9.-]/g, "");
          } else {
            patch.description = cell.trim();
          }
        });
        next[rowIndex] = { ...next[rowIndex], ...patch };
      });
      return next;
    });
  };

  const handleSaveAll = async () => {
    const valid: TransactionInsertRow[] = [];
    for (const r of rows) {
      const amount = parseFloat(r.amount);
      if (!r.description.trim() || Number.isNaN(amount) || amount === 0 || !r.account_id) continue;
      valid.push({
        account_id: r.account_id,
        category_id: r.category_id,
        amount,
        description: r.description.trim(),
        merchant_raw: r.description.trim(),
        merchant_normalized: normalizeMerchant(r.description),
        tx_date: r.tx_date,
        source: "manual",
      });
    }
    if (valid.length === 0) {
      toast.error("Fill in at least one row (description + a non-zero amount)");
      return;
    }
    try {
      await insertMany.mutateAsync(valid);
      toast.success(`Added ${valid.length} transaction${valid.length === 1 ? "" : "s"}`);
      setRows([newRow(defaultAccountId), newRow(defaultAccountId), newRow(defaultAccountId)]);
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save those transactions");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Paste rows copied from Excel or Google Sheets (Date, Description, Amount columns) directly into any cell — or type them in by hand. Negative amounts are expenses, positive are income.
      </p>
      <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[170px]">Category</TableHead>
              <TableHead className="w-[150px]">Account</TableHead>
              <TableHead className="w-[120px]">Amount</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={r.id}>
                <TableCell onPaste={(e) => handlePaste(idx, "tx_date", e)}>
                  <DatePicker value={r.tx_date} onChange={(v) => updateRow(r.id, { tx_date: v })} className="h-9" />
                </TableCell>
                <TableCell onPaste={(e) => handlePaste(idx, "description", e)}>
                  <Input
                    value={r.description}
                    onChange={(e) => updateRow(r.id, { description: e.target.value })}
                    placeholder="Merchant or description"
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <CategorySelect value={r.category_id} onChange={(v) => updateRow(r.id, { category_id: v })} className="h-9" />
                </TableCell>
                <TableCell>
                  <AccountSelect value={r.account_id} onChange={(v) => updateRow(r.id, { account_id: v })} className="h-9" />
                </TableCell>
                <TableCell onPaste={(e) => handlePaste(idx, "amount", e)}>
                  <Input
                    value={r.amount}
                    onChange={(e) => updateRow(r.id, { amount: e.target.value })}
                    placeholder="-12.50"
                    inputMode="decimal"
                    className="h-9 font-mono-data"
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(r.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={addRow} className="gap-1.5 text-muted-foreground">
          <Plus className="h-3.5 w-3.5" /> Add row
        </Button>
        <Button
          onClick={handleSaveAll}
          disabled={insertMany.isPending}
          className="gap-2 bg-gradient-to-r from-primary to-gold text-primary-foreground hover:opacity-90"
        >
          {insertMany.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save all rows
        </Button>
      </div>
    </div>
  );
}

function parsePastedDate(raw: string): string | null {
  // Accepts ISO (2026-07-14) or US-style (7/14/2026, 07/14/26) pasted dates.
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return raw;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(raw);
  if (us) {
    let [, m, d, y] = us;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}
