import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SliderField } from "@/components/simulation/SliderField";
import type { SimulationInput } from "@/lib/simulation/types";
import type { InputAction } from "@/hooks/useSimulationReducer";

export function SettingsSection({ input, dispatch }: { input: SimulationInput; dispatch: React.Dispatch<InputAction> }) {
  const { settings } = input;

  return (
    <div className="space-y-6">
      <SliderField
        id="settings-horizon"
        label="Time horizon"
        value={settings.horizonYears}
        onChange={(v) => dispatch({ type: "UPDATE_SETTINGS", patch: { horizonYears: v } })}
        min={1}
        max={40}
        step={1}
        format={(v) => `${v} year${v === 1 ? "" : "s"}`}
      />

      <div>
        <p className="mb-2 text-sm text-foreground">Display resolution</p>
        <ToggleGroup
          type="single"
          value={settings.granularity}
          onValueChange={(v) => v && dispatch({ type: "UPDATE_SETTINGS", patch: { granularity: v as "monthly" | "yearly" } })}
          className="grid grid-cols-2"
        >
          <ToggleGroupItem value="yearly" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            Yearly
          </ToggleGroupItem>
          <ToggleGroupItem value="monthly" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            Monthly
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <SliderField
        id="settings-inflation"
        label="Expense inflation rate"
        value={Math.round(settings.inflationRate * 1000) / 10}
        onChange={(v) => dispatch({ type: "UPDATE_SETTINGS", patch: { inflationRate: v / 100 } })}
        min={0}
        max={10}
        step={0.1}
        format={(v) => `${v}%`}
        helpText="Defaults to a reasonable historical average — adjust if you expect something different."
      />

      <SliderField
        id="settings-tax"
        label="Estimated flat tax rate"
        value={Math.round(settings.taxRate * 1000) / 10}
        onChange={(v) => dispatch({ type: "UPDATE_SETTINGS", patch: { taxRate: v / 100 } })}
        min={0}
        max={45}
        step={0.5}
        format={(v) => `${v}%`}
        helpText="A simple flat-rate estimate for planning purposes, not a real tax calculation."
      />

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div>
          <Label htmlFor="settings-real-dollars" className="text-sm text-foreground">
            Show in today's dollars
          </Label>
          <p className="text-xs text-muted-foreground">Adjusts future values for inflation so they're comparable to today.</p>
        </div>
        <Switch
          id="settings-real-dollars"
          checked={settings.realDollars}
          onCheckedChange={(checked) => dispatch({ type: "UPDATE_SETTINGS", patch: { realDollars: checked } })}
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div>
          <Label htmlFor="settings-monte-carlo" className="text-sm text-foreground">
            Monte Carlo mode
          </Label>
          <p className="text-xs text-muted-foreground">
            Runs 300 simulated futures with randomized market returns and shows the 10th–90th percentile range instead of one line.
          </p>
        </div>
        <Switch
          id="settings-monte-carlo"
          checked={settings.monteCarloEnabled}
          onCheckedChange={(checked) => dispatch({ type: "UPDATE_SETTINGS", patch: { monteCarloEnabled: checked } })}
        />
      </div>
    </div>
  );
}
