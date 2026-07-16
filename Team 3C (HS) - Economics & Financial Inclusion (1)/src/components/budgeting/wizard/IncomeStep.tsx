import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/simulation/NumberField";
import { useDetectedIncome } from "@/hooks/useBudgetWizardData";
import { moneyAbs } from "@/lib/format";

interface IncomeStepProps {
  income: number;
  onChange: (income: number) => void;
  onNext: () => void;
}

export function IncomeStep({ income, onChange, onNext }: IncomeStepProps) {
  const { data: detected = 0 } = useDetectedIncome();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl text-foreground">What's your monthly take-home income?</h2>
        <p className="mt-1 text-sm text-muted-foreground">After taxes — this is what actually lands in your accounts each month.</p>
      </div>

      {detected > 0 && income !== detected && (
        <button
          type="button"
          onClick={() => onChange(detected)}
          className="flex w-full items-center gap-2 rounded-[var(--radius)] border border-primary/30 bg-primary/5 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-primary/10"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          We detected <span className="font-mono-data font-semibold">{moneyAbs(detected)}</span>/month from your transactions — use this?
        </button>
      )}

      <NumberField id="wizard-income" label="Monthly take-home income" prefix="$" value={income} onChange={onChange} step={50} />

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={income <= 0} className="bg-gradient-to-r from-primary to-gold text-primary-foreground hover:opacity-90">
          Next
        </Button>
      </div>
    </div>
  );
}
