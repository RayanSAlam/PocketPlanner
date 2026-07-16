import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SliderFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  helpText?: string;
}

/**
 * A slider paired with a precise numeric input for the same value — drag
 * for a feel, type for precision. Both are labeled for screen readers
 * (Radix Slider already provides keyboard control: arrow keys, Home/End,
 * Page Up/Down out of the box).
 */
export function SliderField({ id, label, value, onChange, min, max, step = 1, format, helpText }: SliderFieldProps) {
  const display = format ? format(value) : String(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-sm text-foreground">
          {label}
        </Label>
        <Input
          id={`${id}-number`}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          aria-label={`${label} — exact value`}
          className="h-8 w-24 shrink-0 text-right font-mono-data text-sm"
        />
      </div>
      <Slider
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
        aria-valuetext={display}
      />
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}
