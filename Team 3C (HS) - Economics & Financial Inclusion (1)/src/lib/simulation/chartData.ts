import type { Granularity, SimulationOutput, TimeStep } from "@/lib/simulation/types";

export interface ChartPoint {
  label: string;
  year: number;
  month: number;
  grossIncome: number;
  netIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  debtPaidThisPeriod: number;
  totalSavings: number;
  totalDebt: number;
  netWorth: number;
  bucketBalances: Record<string, number>;
  debtBalances: Record<string, number>;
}

/**
 * Aggregates monthly simulation output for display. Flow quantities
 * (income, expenses, cash flow, debt paid) are SUMMED across the months of
 * a year — otherwise a mid-year raise would make "yearly income" look like
 * whatever December happened to be. Stock quantities (balances, net worth)
 * use the year-END snapshot instead, since summing a balance across months
 * would be meaningless.
 */
export function toChartPoints(output: SimulationOutput, granularity: Granularity): ChartPoint[] {
  if (granularity === "monthly") {
    return output.map((s) => toPoint(`M${s.month + 1}`, s, s));
  }

  const years = Array.from(new Set(output.map((s) => s.year))).sort((a, b) => a - b);
  return years.map((year) => {
    const monthsInYear = output.filter((s) => s.year === year);
    const lastMonth = monthsInYear[monthsInYear.length - 1];
    const summed: Pick<TimeStep, "grossIncome" | "netIncome" | "totalExpenses" | "netCashFlow" | "debtPaidThisPeriod"> = {
      grossIncome: sum(monthsInYear, "grossIncome"),
      netIncome: sum(monthsInYear, "netIncome"),
      totalExpenses: sum(monthsInYear, "totalExpenses"),
      netCashFlow: sum(monthsInYear, "netCashFlow"),
      debtPaidThisPeriod: sum(monthsInYear, "debtPaidThisPeriod"),
    };
    return toPoint(`Yr ${year + 1}`, summed, lastMonth);
  });
}

function sum(steps: TimeStep[], key: "grossIncome" | "netIncome" | "totalExpenses" | "netCashFlow" | "debtPaidThisPeriod"): number {
  return steps.reduce((total, step) => total + step[key], 0);
}

function toPoint(
  label: string,
  flows: Pick<TimeStep, "grossIncome" | "netIncome" | "totalExpenses" | "netCashFlow" | "debtPaidThisPeriod">,
  snapshot: Pick<TimeStep, "year" | "month" | "totalSavings" | "totalDebt" | "netWorth" | "bucketBalances" | "debtBalances">,
): ChartPoint {
  return {
    label,
    year: snapshot.year,
    month: snapshot.month,
    grossIncome: flows.grossIncome,
    netIncome: flows.netIncome,
    totalExpenses: flows.totalExpenses,
    netCashFlow: flows.netCashFlow,
    debtPaidThisPeriod: flows.debtPaidThisPeriod,
    totalSavings: snapshot.totalSavings,
    totalDebt: snapshot.totalDebt,
    netWorth: snapshot.netWorth,
    bucketBalances: snapshot.bucketBalances,
    debtBalances: snapshot.debtBalances,
  };
}
