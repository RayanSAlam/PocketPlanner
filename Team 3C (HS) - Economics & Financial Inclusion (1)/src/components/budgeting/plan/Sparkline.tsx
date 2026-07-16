import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { useCategorySpendHistory } from "@/hooks/useCategorySpendHistory";
import { moneyAbs, formatMonthYear } from "@/lib/format";

export function Sparkline({ categoryId }: { categoryId: string }) {
  const { data } = useCategorySpendHistory(categoryId);
  if (!data || data.length === 0) return <div className="h-6 w-16" />;

  return (
    <div className="h-6 w-16 opacity-70 transition-opacity hover:opacity-100">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
          <Line type="monotone" dataKey="total" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const point = payload[0].payload as { month: string; total: number };
              return (
                <div className="rounded-md border border-border bg-popover px-2 py-1 text-[11px] shadow-sm">
                  <span className="text-muted-foreground">{formatMonthYear(point.month)}: </span>
                  <span className="font-mono-data text-foreground">{moneyAbs(point.total)}</span>
                </div>
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
