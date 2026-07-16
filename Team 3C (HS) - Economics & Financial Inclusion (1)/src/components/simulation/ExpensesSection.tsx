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

export function ExpensesSection({ input, dispatch }: { input: SimulationInput; dispatch: React.Dispatch<InputAction> }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {input.expenses.map((expense) => (
          <div key={expense.id} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={expense.label}
                onChange={(e) => dispatch({ type: "UPDATE_EXPENSE", id: expense.id, patch: { label: e.target.value } })}
                className="h-8 flex-1 text-sm font-medium"
                aria-label="Expense name"
              />
              <ToggleGroup
                type="single"
                value={expense.kind}
                onValueChange={(v) => v && dispatch({ type: "UPDATE_EXPENSE", id: expense.id, patch: { kind: v as "fixed" | "discretionary" } })}
              >
                <ToggleGroupItem value="fixed" className="h-8 px-2 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Fixed
                </ToggleGroupItem>
                <ToggleGroupItem value="discretionary" className="h-8 px-2 text-xs data-[state=on]:bg-gold data-[state=on]:text-primary-foreground">
                  Discretionary
                </ToggleGroupItem>
              </ToggleGroup>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => dispatch({ type: "REMOVE_EXPENSE", id: expense.id })}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            <SliderField
              id={`expense-${expense.id}`}
              label="Monthly amount"
              value={expense.monthlyAmount}
              onChange={(v) => dispatch({ type: "UPDATE_EXPENSE", id: expense.id, patch: { monthlyAmount: v } })}
              min={0}
              max={10000}
              step={25}
              format={(v) => `$${v.toLocaleString()}`}
            />
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5"
        onClick={() => dispatch({ type: "ADD_EXPENSE", expense: { id: nextId("expense"), label: "New expense", monthlyAmount: 200, kind: "discretionary" } })}
      >
        <Plus className="h-3.5 w-3.5" /> Add expense
      </Button>

      <div className="border-t border-border pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">One-time expenses (car, wedding, etc.)</p>
        <div className="space-y-2">
          {input.oneTimeExpenses.map((item) => (
            <div key={item.id} className="flex items-end gap-2">
              <Input
                value={item.label}
                onChange={(e) => dispatch({ type: "UPDATE_ONE_TIME_EXPENSE", id: item.id, patch: { label: e.target.value } })}
                className="h-8 flex-1 text-sm"
                aria-label="One-time expense label"
              />
              <NumberField
                id={`ote-${item.id}-amount`}
                label=""
                value={item.amount}
                onChange={(v) => dispatch({ type: "UPDATE_ONE_TIME_EXPENSE", id: item.id, patch: { amount: v } })}
                prefix="$"
                className="w-28"
              />
              <NumberField
                id={`ote-${item.id}-year`}
                label=""
                value={item.year}
                onChange={(v) => dispatch({ type: "UPDATE_ONE_TIME_EXPENSE", id: item.id, patch: { year: v } })}
                suffix="yr"
                className="w-20"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => dispatch({ type: "REMOVE_ONE_TIME_EXPENSE", id: item.id })}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 gap-1.5 text-muted-foreground"
          onClick={() => dispatch({ type: "ADD_ONE_TIME_EXPENSE", item: { id: nextId("ote"), label: "New car", amount: 15000, year: 3 } })}
        >
          <Plus className="h-3.5 w-3.5" /> Add one-time expense
        </Button>
      </div>
    </div>
  );
}
