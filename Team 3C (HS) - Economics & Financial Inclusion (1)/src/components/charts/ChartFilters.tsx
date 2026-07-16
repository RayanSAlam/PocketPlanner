import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/transactions/DatePicker";
import { useAccounts } from "@/hooks/useAccounts";
import type { DateRange } from "@/hooks/useChartData";

export type RangePreset = "month" | "3m" | "6m" | "ytd" | "custom";

const toIso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function rangeForPreset(preset: RangePreset, custom?: DateRange): DateRange {
  const now = new Date();
  const end = toIso(now);
  switch (preset) {
    case "month":
      return { start: toIso(new Date(now.getFullYear(), now.getMonth(), 1)), end };
    case "3m":
      return { start: toIso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), end };
    case "6m":
      return { start: toIso(new Date(now.getFullYear(), now.getMonth() - 5, 1)), end };
    case "ytd":
      return { start: toIso(new Date(now.getFullYear(), 0, 1)), end };
    case "custom":
      return custom ?? { start: toIso(new Date(now.getFullYear(), now.getMonth(), 1)), end };
  }
}

interface ChartFiltersProps {
  preset: RangePreset;
  onPresetChange: (p: RangePreset) => void;
  customRange: DateRange;
  onCustomRangeChange: (r: DateRange) => void;
  accountId: string | null;
  onAccountChange: (id: string | null) => void;
}

export function ChartFilters({
  preset,
  onPresetChange,
  customRange,
  onCustomRangeChange,
  accountId,
  onAccountChange,
}: ChartFiltersProps) {
  const { data: accounts = [] } = useAccounts();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-3">
      <ToggleGroup type="single" value={preset} onValueChange={(v) => v && onPresetChange(v as RangePreset)}>
        <ToggleGroupItem value="month" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          This month
        </ToggleGroupItem>
        <ToggleGroupItem value="3m" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          3M
        </ToggleGroupItem>
        <ToggleGroupItem value="6m" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          6M
        </ToggleGroupItem>
        <ToggleGroupItem value="ytd" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          YTD
        </ToggleGroupItem>
        <ToggleGroupItem value="custom" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          Custom
        </ToggleGroupItem>
      </ToggleGroup>

      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <DatePicker value={customRange.start} onChange={(v) => onCustomRangeChange({ ...customRange, start: v })} className="h-9 w-36" />
          <span className="text-xs text-muted-foreground">to</span>
          <DatePicker value={customRange.end} onChange={(v) => onCustomRangeChange({ ...customRange, end: v })} className="h-9 w-36" />
        </div>
      )}

      <div className="ml-auto">
        <Select value={accountId ?? "all"} onValueChange={(v) => onAccountChange(v === "all" ? null : v)}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
