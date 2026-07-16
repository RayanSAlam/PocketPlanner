import { useState } from "react";
import { Briefcase, Baby, Home, PalmtreeIcon, TrendingDown, Plus, Trash2, Pencil, Milestone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { NumberField } from "@/components/simulation/NumberField";
import { SliderField } from "@/components/simulation/SliderField";
import { cn } from "@/lib/utils";
import type { LifeEvent, LifeEventType, SimulationInput } from "@/lib/simulation/types";
import type { InputAction } from "@/hooks/useSimulationReducer";

const EVENT_META: Record<LifeEventType, { label: string; icon: typeof Briefcase; color: string }> = {
  job_change: { label: "Job change", icon: Briefcase, color: "bg-primary text-primary-foreground" },
  child: { label: "Having a child", icon: Baby, color: "bg-gold text-primary-foreground" },
  home_purchase: { label: "Buying a home", icon: Home, color: "bg-primary text-primary-foreground" },
  retirement: { label: "Retirement", icon: PalmtreeIcon, color: "bg-gold text-primary-foreground" },
  market_crash: { label: "Market crash", icon: TrendingDown, color: "bg-destructive text-destructive-foreground" },
};

let seq = 0;
const nextId = () => `event-${Date.now()}-${++seq}`;

function blankEvent(type: LifeEventType, year: number): LifeEvent {
  const base = { id: nextId(), type, year, label: EVENT_META[type].label };
  switch (type) {
    case "job_change":
      return { ...base, incomeDeltaMonthly: 500 };
    case "child":
      return { ...base, expenseDeltaMonthly: 800 };
    case "home_purchase":
      return { ...base, oneTimeCost: 20000, newMortgage: { principal: 300000, annualInterestRate: 0.065, minimumPayment: 1900 } };
    case "retirement":
      return { ...base, retirementWithdrawalMonthly: 4000 };
    case "market_crash":
      return { ...base, crashReturnRate: -0.3 };
  }
}

interface LifeEventsTimelineProps {
  input: SimulationInput;
  dispatch: React.Dispatch<InputAction>;
}

export function LifeEventsTimeline({ input, dispatch }: LifeEventsTimelineProps) {
  const [editing, setEditing] = useState<LifeEvent | null>(null);
  const horizon = input.settings.horizonYears;
  const sortedEvents = [...input.lifeEvents].sort((a, b) => a.year - b.year);

  const openNew = () => setEditing(blankEvent("job_change", Math.min(1, horizon)));
  const openEdit = (event: LifeEvent) => setEditing(event);

  const handleSave = (event: LifeEvent) => {
    const exists = input.lifeEvents.some((e) => e.id === event.id);
    dispatch(exists ? { type: "UPDATE_LIFE_EVENT", id: event.id, patch: event } : { type: "ADD_LIFE_EVENT", event });
    setEditing(null);
  };

  return (
    <CardShell
      icon={Milestone}
      title="Life Events & Milestones"
      subtitle="Pin the moments that change everything — a new job, a home, retirement"
      action={
        <Button size="sm" variant="secondary" className="gap-1.5" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Add event
        </Button>
      }
    >
      {sortedEvents.length === 0 ? (
        <EmptyRow>No life events yet — add one to see how it bends your trajectory</EmptyRow>
      ) : (
        <div className="space-y-4">
          {/* Visual timeline strip */}
          <div className="relative h-10 rounded-full bg-secondary/50">
            <div className="absolute inset-y-0 left-0 right-0 mx-3 flex items-center">
              <div className="h-0.5 w-full bg-border" />
            </div>
            {sortedEvents.map((event) => {
              const meta = EVENT_META[event.type];
              const Icon = meta.icon;
              const pct = horizon > 0 ? Math.min(100, Math.max(0, (event.year / horizon) * 100)) : 0;
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openEdit(event)}
                  title={`${event.label} — Year ${event.year}`}
                  style={{ left: `calc(${pct}% )` }}
                  className={cn(
                    "absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-sm ring-2 ring-background transition-transform hover:scale-110",
                    meta.color,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              );
            })}
          </div>

          {/* Editable list */}
          <ul className="divide-y divide-border">
            {sortedEvents.map((event) => {
              const meta = EVENT_META[event.type];
              const Icon = meta.icon;
              return (
                <li key={event.id} className="flex items-center gap-3 py-2.5">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.color)}>
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{event.label}</p>
                    <p className="text-xs text-muted-foreground">Year {event.year}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(event)}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => dispatch({ type: "REMOVE_LIFE_EVENT", id: event.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {editing && (
        <LifeEventEditor
          event={editing}
          horizon={horizon}
          expenses={input.expenses}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </CardShell>
  );
}

function LifeEventEditor({
  event,
  horizon,
  expenses,
  onCancel,
  onSave,
}: {
  event: LifeEvent;
  horizon: number;
  expenses: SimulationInput["expenses"];
  onCancel: () => void;
  onSave: (event: LifeEvent) => void;
}) {
  const [draft, setDraft] = useState<LifeEvent>(event);

  const setType = (type: LifeEventType) => {
    const fresh = blankEvent(type, draft.year);
    setDraft({ ...fresh, id: draft.id, label: draft.label === EVENT_META[draft.type].label ? fresh.label : draft.label });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{EVENT_META[draft.type].label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-foreground">Event type</label>
            <Select value={draft.type} onValueChange={(v) => setType(v as LifeEventType)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(EVENT_META) as LifeEventType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {EVENT_META[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="event-label" className="text-sm text-foreground">
              Label
            </label>
            <Input id="event-label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="mt-1.5" />
          </div>

          <SliderField
            id="event-year"
            label="Year it happens"
            value={draft.year}
            onChange={(v) => setDraft({ ...draft, year: v })}
            min={0}
            max={Math.max(0, horizon - 1)}
            step={1}
            format={(v) => `Year ${v}`}
          />

          {draft.type === "job_change" && (
            <NumberField
              id="event-income-delta"
              label="Monthly income change"
              value={draft.incomeDeltaMonthly ?? 0}
              onChange={(v) => setDraft({ ...draft, incomeDeltaMonthly: v })}
              prefix="$"
              min={-20000}
            />
          )}

          {draft.type === "child" && (
            <NumberField
              id="event-expense-delta"
              label="Added monthly expense"
              value={draft.expenseDeltaMonthly ?? 0}
              onChange={(v) => setDraft({ ...draft, expenseDeltaMonthly: v })}
              prefix="$"
            />
          )}

          {draft.type === "home_purchase" && (
            <div className="space-y-4">
              <NumberField
                id="event-down-payment"
                label="Down payment / one-time cost"
                value={draft.oneTimeCost ?? 0}
                onChange={(v) => setDraft({ ...draft, oneTimeCost: v })}
                prefix="$"
              />
              <NumberField
                id="event-mortgage-principal"
                label="Mortgage principal"
                value={draft.newMortgage?.principal ?? 0}
                onChange={(v) => setDraft({ ...draft, newMortgage: { ...draft.newMortgage!, principal: v } })}
                prefix="$"
              />
              <SliderField
                id="event-mortgage-rate"
                label="Mortgage interest rate"
                value={Math.round((draft.newMortgage?.annualInterestRate ?? 0) * 1000) / 10}
                onChange={(v) => setDraft({ ...draft, newMortgage: { ...draft.newMortgage!, annualInterestRate: v / 100 } })}
                min={0}
                max={12}
                step={0.125}
                format={(v) => `${v}%`}
              />
              <NumberField
                id="event-mortgage-payment"
                label="Monthly mortgage payment"
                value={draft.newMortgage?.minimumPayment ?? 0}
                onChange={(v) => setDraft({ ...draft, newMortgage: { ...draft.newMortgage!, minimumPayment: v } })}
                prefix="$"
              />
              {expenses.length > 0 && (
                <div>
                  <label className="text-sm text-foreground">Remove an existing expense (e.g. rent)</label>
                  <Select
                    value={draft.removedExpenseId ?? "none"}
                    onValueChange={(v) => setDraft({ ...draft, removedExpenseId: v === "none" ? undefined : v })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {expenses.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {draft.type === "retirement" && (
            <NumberField
              id="event-withdrawal"
              label="Fixed monthly withdrawal in retirement"
              value={draft.retirementWithdrawalMonthly ?? 0}
              onChange={(v) => setDraft({ ...draft, retirementWithdrawalMonthly: v })}
              prefix="$"
            />
          )}

          {draft.type === "market_crash" && (
            <SliderField
              id="event-crash-rate"
              label="Return rate that year"
              value={Math.round((draft.crashReturnRate ?? -0.3) * 1000) / 10}
              onChange={(v) => setDraft({ ...draft, crashReturnRate: v / 100 })}
              min={-60}
              max={0}
              step={1}
              format={(v) => `${v}%`}
              helpText="Overrides every account's return for this one year only."
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)} className="bg-gradient-to-r from-primary to-gold text-primary-foreground hover:opacity-90">
            Save event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
