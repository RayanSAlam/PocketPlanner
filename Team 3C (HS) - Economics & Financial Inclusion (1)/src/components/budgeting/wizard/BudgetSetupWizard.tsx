import { useState } from "react";
import { Wand2 } from "lucide-react";
import { CardShell } from "@/components/dashboard/CardShell";
import { cn } from "@/lib/utils";
import { IncomeStep } from "@/components/budgeting/wizard/IncomeStep";
import { MethodStep } from "@/components/budgeting/wizard/MethodStep";
import { ReviewStep } from "@/components/budgeting/wizard/ReviewStep";
import type { BudgetMethod } from "@/lib/budgeting/methodDefaults";

const STEPS = ["Income", "Method", "Review"];

export function BudgetSetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [income, setIncome] = useState(0);
  const [method, setMethod] = useState<BudgetMethod | null>(null);

  return (
    <div className="mx-auto max-w-xl">
      <CardShell icon={Wand2} title="Let's set up your budget" subtitle="Three quick steps and you're tracking">
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((label, i) => {
            const idx = i + 1;
            const active = idx === step;
            const done = idx < step;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                    active || done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {idx}
                </div>
                <span className={cn("text-xs", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                {idx < STEPS.length && <div className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} />}
              </div>
            );
          })}
        </div>

        {step === 1 && <IncomeStep income={income} onChange={setIncome} onNext={() => setStep(2)} />}
        {step === 2 && (
          <MethodStep method={method} onChange={setMethod} onNext={() => setStep(3)} onBack={() => setStep(1)} />
        )}
        {step === 3 && method && (
          <ReviewStep income={income} method={method} onBack={() => setStep(2)} onFinish={onComplete} />
        )}
      </CardShell>
    </div>
  );
}
