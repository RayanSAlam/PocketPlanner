import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  step?: number;
  className?: string;
}

/** For unbounded/large-range values (balances, principal) where a slider isn't a good fit. */
export function NumberField({ id, label, value, onChange, prefix, suffix, min = 0, step = 1, className }: NumberFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-sm text-foreground">
        {label}
      </Label>
      <div className="relative mt-1.5">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <Input
          id={id}
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isNaN(v) ? 0 : v);
          }}
          className={`font-mono-data ${prefix ? "pl-6" : ""} ${suffix ? "pr-8" : ""}`}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
