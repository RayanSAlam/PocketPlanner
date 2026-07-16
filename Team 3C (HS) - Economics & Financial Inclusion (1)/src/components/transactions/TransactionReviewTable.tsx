import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DatePicker } from "@/components/transactions/DatePicker";
import { CategorySelect } from "@/components/transactions/CategorySelect";
import { AccountSelect } from "@/components/transactions/AccountSelect";
import { ConfidenceDot } from "@/components/transactions/ConfidenceDot";
import { cn } from "@/lib/utils";
import type { Confidence } from "@/lib/parsing/types";

export interface ReviewRow {
  id: string;
  date: string | null;
  amount: number | null;
  description: string;
  category_id: string | null;
  account_id: string;
  confidence: Confidence;
  included: boolean;
  isDuplicate: boolean;
}

interface TransactionReviewTableProps {
  rows: ReviewRow[];
  onChange: (rows: ReviewRow[]) => void;
  readOnly?: boolean;
}

export function TransactionReviewTable({ rows, onChange, readOnly }: TransactionReviewTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string | null>(null);

  const update = (id: string, patch: Partial<ReviewRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const remove = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const applyBulkCategory = () => {
    if (!bulkCategory || selected.size === 0) return;
    onChange(rows.map((r) => (selected.has(r.id) ? { ...r, category_id: bulkCategory } : r)));
    setSelected(new Set());
    setBulkCategory(null);
  };

  const deleteSelected = () => {
    onChange(rows.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
  };

  return (
    <div className="space-y-3">
      {!readOnly && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-secondary/60 px-3 py-2 text-sm">
          <span className="text-foreground">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <CategorySelect value={bulkCategory} onChange={setBulkCategory} className="h-8 w-40" />
            <Button size="sm" variant="secondary" onClick={applyBulkCategory} disabled={!bulkCategory}>
              Recategorize
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={deleteSelected}>
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {!readOnly && <TableHead className="w-8" />}
              <TableHead className="w-6" />
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[170px]">Category</TableHead>
              <TableHead className="w-[150px]">Account</TableHead>
              <TableHead className="w-[120px]">Amount</TableHead>
              {!readOnly && <TableHead className="w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className={cn(!r.included && "opacity-50")}>
                {!readOnly && (
                  <TableCell>
                    <Checkbox checked={selected.has(r.id)} onCheckedChange={(v) => toggleSelected(r.id, v === true)} />
                  </TableCell>
                )}
                <TableCell>
                  <ConfidenceDot confidence={r.confidence} />
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="text-sm text-foreground">{r.date ?? "—"}</span>
                  ) : (
                    <DatePicker value={r.date ?? ""} onChange={(v) => update(r.id, { date: v })} className={cn("h-9", !r.date && "border-destructive/50")} />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="text-sm text-foreground">{r.description}</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Input value={r.description} onChange={(e) => update(r.id, { description: e.target.value })} className="h-9" />
                      {r.isDuplicate && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="shrink-0 gap-1 border-gold text-gold">
                              <AlertTriangle className="h-3 w-3" /> Possible duplicate
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>This looks similar to a transaction you already have — double-check before saving.</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    <CategorySelect value={r.category_id} onChange={(v) => update(r.id, { category_id: v })} className="h-9" />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    <AccountSelect value={r.account_id} onChange={(v) => update(r.id, { account_id: v })} className="h-9" />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="font-mono-data text-sm text-foreground">{r.amount?.toFixed(2) ?? "—"}</span>
                  ) : (
                    <Input
                      value={r.amount ?? ""}
                      onChange={(e) => update(r.id, { amount: e.target.value === "" ? null : parseFloat(e.target.value) })}
                      inputMode="decimal"
                      className={cn("h-9 font-mono-data", r.amount === null && "border-destructive/50")}
                    />
                  )}
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
