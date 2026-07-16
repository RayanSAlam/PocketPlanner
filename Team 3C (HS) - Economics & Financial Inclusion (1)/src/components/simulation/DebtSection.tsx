import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SliderField } from "@/components/simulation/SliderField";
import { NumberField } from "@/components/simulation/NumberField";
import type { SimulationInput } from "@/lib/simulation/types";
import type { InputAction } from "@/hooks/useSimulationReducer";

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++seq}`;

export function DebtSection({ input, dispatch }: { input: SimulationInput; dispatch: React.Dispatch<InputAction> }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm text-foreground">Payoff strategy</p>
        <ToggleGroup
          type="single"
          value={input.settings.payoffStrategy}
          onValueChange={(v) => v && dispatch({ type: "UPDATE_SETTINGS", patch: { payoffStrategy: v as "avalanche" | "snowball" } })}
          className="grid grid-cols-2"
        >
          <ToggleGroupItem value="avalanche" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            Avalanche
          </ToggleGroupItem>
          <ToggleGroupItem value="snowball" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            Snowball
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {input.settings.payoffStrategy === "avalanche"
            ? "Extra payments go to the highest-interest debt first — saves the most money."
            : "Extra payments go to the smallest balance first — quicker wins to stay motivated."}
        </p>
      </div>

      <div className="space-y-4">
        {input.debts.map((debt) => (
          <div key={debt.id} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={debt.label}
                onChange={(e) => dispatch({ type: "UPDATE_DEBT", id: debt.id, patch: { label: e.target.value } })}
                className="h-8 flex-1 text-sm font-medium"
                aria-label="Debt name"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => dispatch({ type: "REMOVE_DEBT", id: debt.id })}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            <NumberField
              id={`debt-${debt.id}-principal`}
              label="Balance"
              value={debt.principal}
              onChange={(v) => dispatch({ type: "UPDATE_DEBT", id: debt.id, patch: { principal: v } })}
              prefix="$"
            />
            <SliderField
              id={`debt-${debt.id}-rate`}
              label="Interest rate (APR)"
              value={Math.round(debt.annualInterestRate * 1000) / 10}
              onChange={(v) => dispatch({ type: "UPDATE_DEBT", id: debt.id, patch: { annualInterestRate: v / 100 } })}
              min={0}
              max={30}
              step={0.25}
              format={(v) => `${v}%`}
            />
            <SliderField
              id={`debt-${debt.id}-min`}
              label="Minimum payment"
              value={debt.minimumPayment}
              onChange={(v) => dispatch({ type: "UPDATE_DEBT", id: debt.id, patch: { minimumPayment: v } })}
              min={0}
              max={5000}
              step={10}
              format={(v) => `$${v.toLocaleString()}`}
            />
            <SliderField
              id={`debt-${debt.id}-extra`}
              label="Extra payment"
              value={debt.extraPayment}
              onChange={(v) => dispatch({ type: "UPDATE_DEBT", id: debt.id, patch: { extraPayment: v } })}
              min={0}
              max={3000}
              step={10}
              format={(v) => `$${v.toLocaleString()}`}
            />
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5"
        onClick={() =>
          dispatch({
            type: "ADD_DEBT",
            debt: { id: nextId("debt"), label: "New debt", principal: 5000, annualInterestRate: 0.15, minimumPayment: 150, extraPayment: 0 },
          })
        }
      >
        <Plus className="h-3.5 w-3.5" /> Add debt
      </Button>
    </div>
  );
}
