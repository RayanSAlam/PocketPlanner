import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SliderField } from "@/components/simulation/SliderField";
import { NumberField } from "@/components/simulation/NumberField";
import type { AccountBucket, SimulationInput } from "@/lib/simulation/types";
import type { InputAction } from "@/hooks/useSimulationReducer";

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++seq}`;

const KIND_LABELS: Record<AccountBucket["kind"], string> = {
  cash: "Cash / Emergency fund",
  retirement: "Retirement account",
  brokerage: "Brokerage",
  savings: "High-yield savings",
};

export function SavingsSection({ input, dispatch }: { input: SimulationInput; dispatch: React.Dispatch<InputAction> }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {input.buckets.map((bucket) => (
          <div key={bucket.id} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={bucket.label}
                onChange={(e) => dispatch({ type: "UPDATE_BUCKET", id: bucket.id, patch: { label: e.target.value } })}
                className="h-8 flex-1 text-sm font-medium"
                aria-label="Account bucket name"
              />
              <Select value={bucket.kind} onValueChange={(v) => dispatch({ type: "UPDATE_BUCKET", id: bucket.id, patch: { kind: v as AccountBucket["kind"] } })}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(KIND_LABELS) as AccountBucket["kind"][]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => dispatch({ type: "REMOVE_BUCKET", id: bucket.id })}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            <NumberField
              id={`bucket-${bucket.id}-balance`}
              label="Current balance"
              value={bucket.balance}
              onChange={(v) => dispatch({ type: "UPDATE_BUCKET", id: bucket.id, patch: { balance: v } })}
              prefix="$"
            />
            <SliderField
              id={`bucket-${bucket.id}-contribution`}
              label="Monthly contribution"
              value={bucket.monthlyContribution}
              onChange={(v) => dispatch({ type: "UPDATE_BUCKET", id: bucket.id, patch: { monthlyContribution: v } })}
              min={0}
              max={5000}
              step={25}
              format={(v) => `$${v.toLocaleString()}`}
            />
            <SliderField
              id={`bucket-${bucket.id}-return`}
              label="Expected annual return"
              value={Math.round(bucket.annualReturnRate * 1000) / 10}
              onChange={(v) => dispatch({ type: "UPDATE_BUCKET", id: bucket.id, patch: { annualReturnRate: v / 100 } })}
              min={0}
              max={12}
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
            type: "ADD_BUCKET",
            bucket: { id: nextId("bucket"), label: "New account", kind: "savings", balance: 0, annualReturnRate: 0.045, monthlyContribution: 100 },
          })
        }
      >
        <Plus className="h-3.5 w-3.5" /> Add account bucket
      </Button>
    </div>
  );
}
