import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthYear } from "@/lib/format";
import { shiftPeriod } from "@/lib/budgeting/period";

export function MonthSwitcher({ period, onChange }: { period: string; onChange: (period: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => onChange(shiftPeriod(period, -1))}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="font-mono-data min-w-[9rem] text-center text-sm text-foreground">{formatMonthYear(period)}</span>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => onChange(shiftPeriod(period, 1))}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
