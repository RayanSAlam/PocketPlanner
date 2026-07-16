import { PieChart, ListChecks, Mail, Grid3x3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BudgetMethod } from "@/lib/budgeting/methodDefaults";

const METHODS: { id: BudgetMethod; label: string; description: string; icon: typeof PieChart; recommended?: boolean }[] = [
  {
    id: "fifty_thirty_twenty",
    label: "50/30/20",
    description: "50% needs, 30% wants, 20% savings — auto-allocates for you.",
    icon: PieChart,
    recommended: true,
  },
  {
    id: "zero_based",
    label: "Zero-based",
    description: "Give every dollar a job — your budget must sum exactly to income.",
    icon: ListChecks,
  },
  {
    id: "envelope",
    label: "Envelope",
    description: "Fixed amounts per category — unspent money visibly stays in the envelope.",
    icon: Mail,
  },
  {
    id: "custom",
    label: "Custom",
    description: "Start from a blank grid and build it your way.",
    icon: Grid3x3,
  },
];

interface MethodStepProps {
  method: BudgetMethod | null;
  onChange: (method: BudgetMethod) => void;
  onNext: () => void;
  onBack: () => void;
}

export function MethodStep({ method, onChange, onNext, onBack }: MethodStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl text-foreground">Choose a budgeting method</h2>
        <p className="mt-1 text-sm text-muted-foreground">You can change this later — this just decides how we seed your first budget.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {METHODS.map((m) => {
          const Icon = m.icon;
          const selected = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={cn(
                "relative flex flex-col gap-2 rounded-[var(--radius)] border p-4 text-left transition-colors",
                selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40",
              )}
            >
              {selected && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-gold text-primary-foreground">
                <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {m.label}
                  {m.recommended && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-medium text-gold-foreground">Recommended</span>}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!method} className="bg-gradient-to-r from-primary to-gold text-primary-foreground hover:opacity-90">
          Next
        </Button>
      </div>
    </div>
  );
}
