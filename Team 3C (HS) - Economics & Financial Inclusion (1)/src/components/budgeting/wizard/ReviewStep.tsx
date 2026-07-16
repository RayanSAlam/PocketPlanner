import { useMemo, useState } from "react";
import { PartyPopper, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/hooks/useCategories";
import { useHistoricalCategoryAverages } from "@/hooks/useBudgetWizardData";
import { useCreateBudget } from "@/hooks/useBudgetPeriod";
import { useAddBudgetLine } from "@/hooks/useBudgetLines";
import { computeMethodAllocation, type BudgetMethod } from "@/lib/budgeting/methodDefaults";
import { getCategoryIcon } from "@/lib/categories";
import { moneyAbs } from "@/lib/format";
import { currentPeriod } from "@/lib/budgeting/period";

interface ReviewStepProps {
  income: number;
  method: BudgetMethod;
  onBack: () => void;
  onFinish: () => void;
}

export function ReviewStep({ income, method, onBack, onFinish }: ReviewStepProps) {
  const { data: categories = [] } = useCategories();
  const { data: historyData } = useHistoricalCategoryAverages();
  const createBudget = useCreateBudget();
  const addLine = useAddBudgetLine();
  const [finishing, setFinishing] = useState(false);

  const historicalBySlug = useMemo(() => {
    if (!historyData) return {};
    const idToSlug = new Map(categories.map((c) => [c.id, c.slug]));
    const bySlug: Record<string, number> = {};
    for (const [categoryId, avg] of Object.entries(historyData.averages)) {
      const slug = idToSlug.get(categoryId);
      if (slug && avg !== undefined) bySlug[slug] = avg;
    }
    return bySlug;
  }, [historyData, categories]);

  const initialAllocation = useMemo(
    () => computeMethodAllocation(method, income, historicalBySlug),
    [method, income, historicalBySlug],
  );

  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const getAmount = (slug: string, fallback: number) => amounts[slug] ?? fallback;

  const total = initialAllocation.reduce((s, l) => s + getAmount(l.slug, l.amountBudgeted), 0);
  const needsLines = initialAllocation.filter((l) => l.group === "Needs");
  const wantsLines = initialAllocation.filter((l) => l.group === "Wants");

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const budget = await createBudget.mutateAsync({ period: currentPeriod(), method, income_expected: income, status: "active" });
      const slugToCategoryId = new Map(categories.map((c) => [c.slug, c.id]));
      let sortOrder = 0;
      for (const line of initialAllocation) {
        const categoryId = slugToCategoryId.get(line.slug);
        const amount = getAmount(line.slug, line.amountBudgeted);
        if (!categoryId || amount <= 0) continue;
        await addLine.mutateAsync({
          budget_id: budget.id,
          category_id: categoryId,
          group_name: line.group,
          amount_budgeted: amount,
          sort_order: sortOrder++,
        });
      }
      toast.success("Your budget is ready!", { icon: <PartyPopper className="h-4 w-4" /> });
      onFinish();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create that budget");
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl text-foreground">Review your starting budget</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {historyData && historyData.monthsOfHistory > 0
            ? "Seeded from your actual spending — tweak anything before you start."
            : "Sensible defaults to start from — tweak anything before you start."}
        </p>
      </div>

      <div className="max-h-[360px] space-y-5 overflow-y-auto pr-1">
        <AllocationGroup title="Needs" lines={needsLines} getAmount={getAmount} setAmounts={setAmounts} />
        <AllocationGroup title="Wants" lines={wantsLines} getAmount={getAmount} setAmounts={setAmounts} />
      </div>

      <div className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-secondary/40 px-4 py-3">
        <span className="text-sm font-medium text-foreground">Total budgeted</span>
        <span className="font-mono-data text-sm font-semibold text-foreground">
          {moneyAbs(total)} <span className="font-normal text-muted-foreground">of {moneyAbs(income)}</span>
        </span>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={finishing}>
          Back
        </Button>
        <Button onClick={handleFinish} disabled={finishing} className="gap-2 bg-gradient-to-r from-primary to-gold text-primary-foreground hover:opacity-90">
          {finishing && <Loader2 className="h-4 w-4 animate-spin" />}
          Finish setup
        </Button>
      </div>
    </div>
  );
}

function AllocationGroup({
  title,
  lines,
  getAmount,
  setAmounts,
}: {
  title: string;
  lines: ReturnType<typeof computeMethodAllocation>;
  getAmount: (slug: string, fallback: number) => number;
  setAmounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}) {
  const { data: categories = [] } = useCategories();
  const bySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);

  return (
    <div>
      <p className="font-mono-data mb-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {lines.map((line) => {
          const category = bySlug.get(line.slug);
          const Icon = getCategoryIcon(category?.icon ?? "circle");
          const amount = getAmount(line.slug, line.amountBudgeted);
          return (
            <div key={line.slug} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">{category?.name ?? line.slug}</p>
                  {line.basedOnHistory && <p className="text-[11px] text-muted-foreground">based on your average of {moneyAbs(line.amountBudgeted)}/mo</p>}
                </div>
              </div>
              <div className="relative w-28 shrink-0">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={amount}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setAmounts((prev) => ({ ...prev, [line.slug]: Number.isNaN(v) ? 0 : v }));
                  }}
                  className="h-8 pl-5 text-right font-mono-data text-sm"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
