import { useState } from "react";
import { Target, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { useBudgetVsActual } from "@/hooks/useChartData";
import { useCategories } from "@/hooks/useCategories";
import { useSetBudget } from "@/hooks/useBudgets";
import { getCategoryIcon } from "@/lib/categories";
import { budgetStatusColor } from "@/components/charts/chartPalette";
import { moneyAbs } from "@/lib/format";

export function BudgetVsActualChart({ month }: { month: string }) {
  const { data, isLoading } = useBudgetVsActual(month);
  const rows = data ?? [];

  return (
    <CardShell
      icon={Target}
      title="Budget vs Actual"
      subtitle="How each category is tracking this month"
      action={<SetBudgetPopover />}
    >
      {isLoading ? (
        <EmptyRow>Loading…</EmptyRow>
      ) : rows.length === 0 ? (
        <EmptyRow>Set a budget for a category to see this chart</EmptyRow>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const Icon = getCategoryIcon(r.category_icon);
            const color = budgetStatusColor(r.pct_used);
            const pct = Math.min(100, r.pct_used);
            return (
              <li key={r.line_id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-foreground">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {r.category_name}
                  </span>
                  <span className="font-mono-data tabular-nums text-muted-foreground">
                    {moneyAbs(r.spent)} / {moneyAbs(r.amount_budgeted)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                {r.pct_used > 100 && <p className="mt-1 text-[11px] text-destructive">Over budget</p>}
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}

function SetBudgetPopover() {
  const { data: categories = [] } = useCategories();
  const setBudget = useSetBudget();
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [open, setOpen] = useState(false);

  const handleSave = async () => {
    const amount = parseFloat(limit);
    if (!categoryId || Number.isNaN(amount) || amount <= 0) {
      toast.error("Pick a category and a limit greater than 0");
      return;
    }
    try {
      await setBudget.mutateAsync({ categoryId, monthlyLimit: amount });
      toast.success("Budget saved");
      setOpen(false);
      setLimit("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that budget");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Set a monthly budget"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <p className="text-sm font-medium text-foreground">Set a monthly limit</p>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Choose a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Input type="number" min="0" step="1" placeholder="Monthly limit" value={limit} onChange={(e) => setLimit(e.target.value)} />
        <Button size="sm" className="w-full" onClick={handleSave} disabled={setBudget.isPending}>
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}
