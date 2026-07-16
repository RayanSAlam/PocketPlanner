import { useState } from "react";
import { ChartFilters, rangeForPreset, type RangePreset } from "@/components/charts/ChartFilters";
import { CategoryDonutChart } from "@/components/charts/CategoryDonutChart";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { SpendingTrendChart } from "@/components/charts/SpendingTrendChart";
import { BudgetVsActualChart } from "@/components/charts/BudgetVsActualChart";
import { TopMerchantsList } from "@/components/charts/TopMerchantsList";
import type { DateRange } from "@/hooks/useChartData";

export default function ChartsPage() {
  const [preset, setPreset] = useState<RangePreset>("month");
  const [customRange, setCustomRange] = useState<DateRange>(rangeForPreset("month"));
  const [accountId, setAccountId] = useState<string | null>(null);

  const range = preset === "custom" ? customRange : rangeForPreset(preset);
  const currentMonth = rangeForPreset("month").start;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 md:space-y-8 md:px-8 md:py-8">
      <div>
        <p className="font-mono-data mb-1 text-[11px] uppercase tracking-[0.12em] text-primary">Charts</p>
        <h1 className="font-display text-2xl text-foreground md:text-3xl">See where it's all going</h1>
      </div>

      <ChartFilters
        preset={preset}
        onPresetChange={setPreset}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        accountId={accountId}
        onAccountChange={setAccountId}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CategoryDonutChart range={range} accountId={accountId} />
        <CashFlowChart range={range} />
        <SpendingTrendChart range={range} />
        <BudgetVsActualChart month={currentMonth} />
      </div>

      <TopMerchantsList range={range} />
    </div>
  );
}
