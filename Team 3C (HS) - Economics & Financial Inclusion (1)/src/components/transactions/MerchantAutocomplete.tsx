import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDistinctMerchants } from "@/hooks/useTransactions";
import { cn } from "@/lib/utils";

interface MerchantAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export function MerchantAutocomplete({ value, onChange, onBlur, placeholder, className }: MerchantAutocompleteProps) {
  const { data: merchants = [] } = useDistinctMerchants();
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    if (!value.trim()) return merchants.slice(0, 6);
    const q = value.trim().toLowerCase();
    return merchants.filter((m) => m.toLowerCase().includes(q)).slice(0, 6);
  }, [value, merchants]);

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder={placeholder ?? "Merchant or description"}
        className={className}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
          onBlur?.();
        }}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {matches.map((m) => (
            <li key={m}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full px-3 py-2 text-left text-sm capitalize text-foreground hover:bg-secondary",
                )}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
