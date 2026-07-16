import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SliderField } from "@/components/simulation/SliderField";
import { NumberField } from "@/components/simulation/NumberField";
import type { SimulationInput } from "@/lib/simulation/types";
import type { InputAction } from "@/hooks/useSimulationReducer";

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++seq}`;

export function IncomeSection({ input, dispatch }: { input: SimulationInput; dispatch: React.Dispatch<InputAction> }) {
  return (
    <div className="space-y-6">
      <div className="space-y-5">
        {input.incomeStreams.map((stream) => (
          <div key={stream.id} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={stream.label}
                onChange={(e) => dispatch({ type: "UPDATE_INCOME_STREAM", id: stream.id, patch: { label: e.target.value } })}
                className="h-8 flex-1 text-sm font-medium"
                aria-label="Income stream name"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => dispatch({ type: "REMOVE_INCOME_STREAM", id: stream.id })}
                aria-label={`Remove ${stream.label}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            <SliderField
              id={`income-${stream.id}-amount`}
              label="Monthly amount"
              value={stream.monthlyAmount}
              onChange={(v) => dispatch({ type: "UPDATE_INCOME_STREAM", id: stream.id, patch: { monthlyAmount: v } })}
              min={0}
              max={25000}
              step={50}
              format={(v) => `$${v.toLocaleString()}`}
            />
            <SliderField
              id={`income-${stream.id}-growth`}
              label="Annual growth rate"
              value={Math.round(stream.annualGrowthRate * 1000) / 10}
              onChange={(v) => dispatch({ type: "UPDATE_INCOME_STREAM", id: stream.id, patch: { annualGrowthRate: v / 100 } })}
              min={0}
              max={15}
              step={0.25}
              format={(v) => `${v}%`}
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
            type: "ADD_INCOME_STREAM",
            stream: { id: nextId("income"), label: "New income", monthlyAmount: 3000, annualGrowthRate: 0.03 },
          })
        }
      >
        <Plus className="h-3.5 w-3.5" /> Add income stream
      </Button>

      <div className="border-t border-border pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">One-time income (bonus, inheritance)</p>
        <div className="space-y-2">
          {input.oneTimeIncome.map((item) => (
            <div key={item.id} className="flex items-end gap-2">
              <Input
                value={item.label}
                onChange={(e) => dispatch({ type: "UPDATE_ONE_TIME_INCOME", id: item.id, patch: { label: e.target.value } })}
                className="h-8 flex-1 text-sm"
                aria-label="One-time income label"
              />
              <NumberField
                id={`oti-${item.id}-amount`}
                label=""
                value={item.amount}
                onChange={(v) => dispatch({ type: "UPDATE_ONE_TIME_INCOME", id: item.id, patch: { amount: v } })}
                prefix="$"
                className="w-28"
              />
              <NumberField
                id={`oti-${item.id}-year`}
                label=""
                value={item.year}
                onChange={(v) => dispatch({ type: "UPDATE_ONE_TIME_INCOME", id: item.id, patch: { year: v } })}
                suffix="yr"
                className="w-20"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => dispatch({ type: "REMOVE_ONE_TIME_INCOME", id: item.id })}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 gap-1.5 text-muted-foreground"
          onClick={() => dispatch({ type: "ADD_ONE_TIME_INCOME", item: { id: nextId("oti"), label: "Bonus", amount: 5000, year: 1 } })}
        >
          <Plus className="h-3.5 w-3.5" /> Add one-time income
        </Button>
      </div>
    </div>
  );
}
