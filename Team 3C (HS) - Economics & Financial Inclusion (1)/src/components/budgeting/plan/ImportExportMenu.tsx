import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, MoreHorizontal, Loader2, Bookmark, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useImportBudgetLines } from "@/hooks/useBudgetLines";
import { useUpdateBudgetMeta } from "@/hooks/useBudgetPeriod";
import { toCsv, parseCsvHeader, detectColumnMapping, parseCsvImport, type CsvImportRow, type BudgetExportRow } from "@/lib/budgeting/csv";
import { saveTemplate, loadTemplate } from "@/lib/budgeting/templateStorage";
import { moneyAbs, formatMonthYear } from "@/lib/format";
import type { BudgetRow } from "@/hooks/useBudgetPeriod";
import type { BudgetProgressRow } from "@/hooks/useBudgetProgress";

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportExportMenu({ budget, rows }: { budget: BudgetRow; rows: BudgetProgressRow[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFilename, setImportFilename] = useState("");
  const [importText, setImportText] = useState("");
  const [xlsxExporting, setXlsxExporting] = useState(false);
  const importLines = useImportBudgetLines();
  const updateBudgetMeta = useUpdateBudgetMeta();

  const exportRows: BudgetExportRow[] = rows.map((r) => ({ category: r.category_name, group: r.group_name, budgeted: r.amount_budgeted, rollover: r.rollover_enabled }));
  const filenameBase = `pocketplanner-budget-${budget.period}`;

  const handleSaveTemplate = () => {
    if (rows.length === 0) {
      toast.error("Nothing to save yet — add a few categories first");
      return;
    }
    saveTemplate({
      method: budget.method,
      incomeExpected: budget.income_expected,
      lines: rows.map((r) => ({
        category_id: r.category_id,
        category_name: r.category_name,
        group_name: r.group_name,
        amount_budgeted: r.amount_budgeted,
        rollover_enabled: r.rollover_enabled,
        sinking_fund_target_annual: r.sinking_fund_target_annual,
        sort_order: r.sort_order,
      })),
    });
    toast.success("Saved as your default budget template");
  };

  const handleApplyTemplate = async () => {
    const template = loadTemplate();
    if (!template) {
      toast.error("No saved template yet — build a budget you like, then \"Save as my default budget\"");
      return;
    }
    try {
      await importLines.mutateAsync(
        template.lines.map((l) => ({
          budget_id: budget.id,
          category_id: l.category_id,
          group_name: l.group_name,
          amount_budgeted: l.amount_budgeted,
          rollover_enabled: l.rollover_enabled,
          sinking_fund_target_annual: l.sinking_fund_target_annual,
          sort_order: l.sort_order,
        })),
      );
      await updateBudgetMeta.mutateAsync({ id: budget.id, method: template.method as BudgetRow["method"], income_expected: template.incomeExpected });
      toast.success(`Applied your template to ${formatMonthYear(budget.period)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't apply that template");
    }
  };

  const handleExportCsv = () => {
    downloadBlob(toCsv(exportRows), `${filenameBase}.csv`, "text/csv");
    toast.success("Budget exported to CSV");
  };

  const handleExportXlsx = async () => {
    setXlsxExporting(true);
    try {
      // Dynamically imported so the ~1MB SheetJS bundle only loads when
      // someone actually exports, not on every Plan tab visit. Write-only
      // usage (XLSX.utils + writeFile) — this app never calls XLSX.read on
      // an uploaded file, which is where this package's known unpatched
      // vulnerabilities (prototype pollution, ReDoS) actually live.
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(
        exportRows.map((r) => ({ Category: r.category, Group: r.group, Budgeted: r.budgeted, Rollover: r.rollover ? "yes" : "no" })),
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Budget");
      XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
      toast.success("Budget exported to Excel");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't export to Excel");
    } finally {
      setXlsxExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result ?? ""));
      setImportFilename(file.name);
      setImportOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <MoreHorizontal className="h-3.5 w-3.5" /> More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCsv} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportXlsx} disabled={xlsxExporting} className="gap-2">
            {xlsxExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Export as Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="h-3.5 w-3.5" /> Import from CSV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSaveTemplate} className="gap-2">
            <Bookmark className="h-3.5 w-3.5" /> Save as my default budget
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleApplyTemplate} disabled={importLines.isPending || updateBudgetMeta.isPending} className="gap-2">
            <Sparkles className="h-3.5 w-3.5" /> Apply my default budget
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelect} />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        budget={budget}
        filename={importFilename}
        csvText={importText}
        existingCategoryNames={rows.map((r) => r.category_name.toLowerCase())}
      />
    </>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  budget,
  filename,
  csvText,
  existingCategoryNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: BudgetRow;
  filename: string;
  csvText: string;
  existingCategoryNames: string[];
}) {
  const { data: categories = [] } = useCategories();
  const importLines = useImportBudgetLines();

  const header = parseCsvHeader(csvText);
  const autoMapping = detectColumnMapping(header);
  const [mapping, setMapping] = useState(autoMapping);
  const activeMapping = Object.keys(mapping).length > 0 ? mapping : autoMapping;

  const { rows: parsedRows, errors } = csvText ? parseCsvImport(csvText, activeMapping) : { rows: [] as CsvImportRow[], errors: [] as string[] };

  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const matched = parsedRows.filter((r) => categoryByName.has(r.category.toLowerCase()));
  const unmatched = parsedRows.filter((r) => !categoryByName.has(r.category.toLowerCase()));

  const handleImport = async () => {
    let sortOrder = 1000; // append after existing rows, exact order doesn't matter much for an import
    const toInsert = matched.map((r) => {
      const category = categoryByName.get(r.category.toLowerCase())!;
      return { budget_id: budget.id, category_id: category.id, group_name: r.group, amount_budgeted: r.budgeted, rollover_enabled: r.rollover, sort_order: sortOrder++ };
    });
    try {
      await importLines.mutateAsync(toInsert);
      toast.success(`Imported ${toInsert.length} categor${toInsert.length === 1 ? "y" : "ies"}${existingCategoryNames.length > 0 ? " (existing ones updated)" : ""}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't import that file");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import {filename}</DialogTitle>
          <DialogDescription>Into your {formatMonthYear(budget.period)} budget. Matches by category name — unmatched rows are skipped.</DialogDescription>
        </DialogHeader>

        {(autoMapping.category === undefined || autoMapping.budgeted === undefined) && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
            <p className="col-span-2 text-xs text-muted-foreground">Couldn't auto-detect all columns — map them manually:</p>
            {(["category", "budgeted", "group", "rollover"] as const).map((field) => (
              <div key={field}>
                <label className="text-xs capitalize text-muted-foreground">{field}</label>
                <Select
                  value={mapping[field] !== undefined ? String(mapping[field]) : ""}
                  onValueChange={(v) => setMapping((prev) => ({ ...prev, [field]: Number(v) }))}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {header.map((h, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
          {matched.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-1.5 py-1 text-sm">
              <span className="text-foreground">{r.category}</span>
              <span className="font-mono-data text-muted-foreground">{moneyAbs(r.budgeted)}</span>
            </div>
          ))}
          {matched.length === 0 && <p className="px-1.5 py-2 text-xs text-muted-foreground">No matching categories found yet.</p>}
        </div>

        {(unmatched.length > 0 || errors.length > 0) && (
          <div className="space-y-1 text-xs text-muted-foreground">
            {unmatched.map((r, i) => (
              <p key={`u-${i}`}>"{r.category}" doesn't match any existing category — skipped.</p>
            ))}
            {errors.map((e, i) => (
              <p key={`e-${i}`}>{e}</p>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={matched.length === 0 || importLines.isPending}>
            Import {matched.length} categor{matched.length === 1 ? "y" : "ies"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
