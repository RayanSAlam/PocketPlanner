import type { SimulationInput, TimeStep, LifeEvent } from "@/lib/simulation/types";
import { annualToEffectiveMonthlyRate, compoundMonthlyBalance, computeTax } from "@/lib/simulation/math";
import { stepDebts, type DebtState } from "@/lib/simulation/debt";

interface WorkingIncomeStream {
  id: string;
  monthlyAmount: number;
  annualGrowthRate: number;
}

interface WorkingExpense {
  id: string;
  monthlyAmount: number;
  active: boolean;
}

export interface SimulationOptions {
  /**
   * If provided, overrides a bucket's return rate for a given year (still
   * subject to a market-crash event, which takes priority for its year).
   * Monte Carlo mode uses this to substitute a freshly-sampled rate per
   * bucket per year instead of the bucket's single static expected rate —
   * the engine itself stays pure/deterministic for a given options input.
   */
  returnRateOverride?: (bucketId: string, year: number, defaultRate: number) => number;
}

/**
 * Runs one deterministic pass of the simulation at monthly resolution
 * (monthly compounding is used even when the UI displays yearly points,
 * since that's what actually keeps growth/amortization accurate).
 *
 * Pure function: same input (and options) always produces the same output,
 * no I/O, no internal randomness — Monte Carlo mode calls this repeatedly
 * with a different `returnRateOverride` per run rather than this function
 * branching on "mode" or calling Math.random() itself.
 */
export function runSimulation(input: SimulationInput, options: SimulationOptions = {}): TimeStep[] {
  const totalMonths = Math.max(1, Math.round(input.settings.horizonYears * 12));

  let incomeStreams: WorkingIncomeStream[] = input.incomeStreams.map((s) => ({
    id: s.id,
    monthlyAmount: s.monthlyAmount,
    annualGrowthRate: s.annualGrowthRate,
  }));
  let expenses: WorkingExpense[] = input.expenses.map((e) => ({ id: e.id, monthlyAmount: e.monthlyAmount, active: true }));
  let debts: DebtState[] = input.debts.map((d) => ({
    id: d.id,
    balance: d.principal,
    annualInterestRate: d.annualInterestRate,
    minimumPayment: d.minimumPayment,
  }));
  const debtExtraById: Record<string, number> = Object.fromEntries(input.debts.map((d) => [d.id, d.extraPayment]));
  let bucketBalances: Record<string, number> = Object.fromEntries(input.buckets.map((b) => [b.id, b.balance]));

  let incomeAdjustment = 0; // running total of job_change deltas
  let retired = false;
  let retirementWithdrawal = 0;
  const crashRateByYear: Record<number, number> = {};

  const eventsByYear = new Map<number, LifeEvent[]>();
  for (const ev of input.lifeEvents) {
    const list = eventsByYear.get(ev.year) ?? [];
    list.push(ev);
    eventsByYear.set(ev.year, list);
  }

  const oneTimeIncomeByMonth = new Map<number, number>();
  for (const oi of input.oneTimeIncome) {
    const month = oi.year * 12;
    oneTimeIncomeByMonth.set(month, (oneTimeIncomeByMonth.get(month) ?? 0) + oi.amount);
  }
  const oneTimeExpenseByMonth = new Map<number, number>();
  for (const oe of input.oneTimeExpenses) {
    const month = oe.year * 12;
    oneTimeExpenseByMonth.set(month, (oneTimeExpenseByMonth.get(month) ?? 0) + oe.amount);
  }

  const results: TimeStep[] = [];

  for (let month = 0; month < totalMonths; month++) {
    const year = Math.floor(month / 12);
    const isYearStart = month % 12 === 0;

    // Annual raise / inflation compounds at each year boundary — the first
    // year always uses the base amounts exactly as entered.
    if (isYearStart && month > 0) {
      incomeStreams = incomeStreams.map((s) => ({ ...s, monthlyAmount: s.monthlyAmount * (1 + s.annualGrowthRate) }));
      expenses = expenses.map((e) => ({ ...e, monthlyAmount: e.monthlyAmount * (1 + input.settings.inflationRate) }));
    }

    // Life events fire once, at the first month of their scheduled year.
    if (isYearStart) {
      for (const ev of eventsByYear.get(year) ?? []) {
        applyLifeEvent(ev, {
          addIncomeAdjustment: (delta) => (incomeAdjustment += delta),
          addExpense: (item) => expenses.push(item),
          deactivateExpense: (id) => (expenses = expenses.map((e) => (e.id === id ? { ...e, active: false } : e))),
          addOneTimeExpense: (amount) => oneTimeExpenseByMonth.set(month, (oneTimeExpenseByMonth.get(month) ?? 0) + amount),
          addDebt: (debt) => {
            debts.push(debt);
            debtExtraById[debt.id] = 0;
          },
          setRetired: (withdrawal) => {
            retired = true;
            retirementWithdrawal = withdrawal;
          },
          setCrashYear: (rate) => (crashRateByYear[year] = rate),
        });
      }
    }

    // --- Income ---
    const streamIncome = retired ? 0 : incomeStreams.reduce((sum, s) => sum + s.monthlyAmount, 0);
    const grossIncome =
      streamIncome + incomeAdjustment + (retired ? retirementWithdrawal : 0) + (oneTimeIncomeByMonth.get(month) ?? 0);
    const netIncome = grossIncome - computeTax(grossIncome, input.settings.taxRate);

    // --- Expenses ---
    const recurringExpenses = expenses.filter((e) => e.active).reduce((sum, e) => sum + e.monthlyAmount, 0);
    const totalExpenses = recurringExpenses + (oneTimeExpenseByMonth.get(month) ?? 0);

    // --- Debt: minimums are mandatory; each debt's extra-payment budget is
    // pooled and rolled toward whichever debt the strategy prioritizes. ---
    const totalExtraBudget = Object.values(debtExtraById).reduce((s, v) => s + v, 0);
    const debtStep = stepDebts(debts, totalExtraBudget, input.settings.payoffStrategy);
    debts = debtStep.debts;

    // --- Savings/investment buckets: each grows at its own rate (or the
    // crash override for every bucket, for the one year a crash fires, which
    // takes priority over a Monte Carlo sampled rate too) plus its fixed
    // monthly contribution. ---
    const crashRateThisYear = crashRateByYear[year];
    const newBucketBalances: Record<string, number> = {};
    for (const bucket of input.buckets) {
      const annualRate =
        crashRateThisYear !== undefined
          ? crashRateThisYear
          : options.returnRateOverride
            ? options.returnRateOverride(bucket.id, year, bucket.annualReturnRate)
            : bucket.annualReturnRate;
      const monthlyRate = annualToEffectiveMonthlyRate(annualRate);
      const prevBalance = bucketBalances[bucket.id] ?? 0;
      newBucketBalances[bucket.id] = compoundMonthlyBalance(prevBalance, monthlyRate, bucket.monthlyContribution);
    }
    bucketBalances = newBucketBalances;

    const totalSavings = Object.values(bucketBalances).reduce((s, v) => s + v, 0);
    const totalBucketContributions = input.buckets.reduce((s, b) => s + b.monthlyContribution, 0);
    const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
    const debtBalances = Object.fromEntries(debts.map((d) => [d.id, d.balance]));

    // Cash flow is reported for transparency — it can go negative, which is
    // a legitimate and useful signal ("your inputs don't balance"), not an
    // error the engine tries to silently correct.
    const netCashFlow = netIncome - totalExpenses - debtStep.totalPaid - totalBucketContributions;
    const netWorth = totalSavings - totalDebt;

    results.push({
      month,
      year,
      grossIncome,
      netIncome,
      totalExpenses,
      netCashFlow,
      bucketBalances: { ...bucketBalances },
      totalSavings,
      debtBalances,
      totalDebt,
      debtPaidThisPeriod: debtStep.totalPaid,
      netWorth,
    });
  }

  return results;
}

interface LifeEventHandlers {
  addIncomeAdjustment: (delta: number) => void;
  addExpense: (item: WorkingExpense) => void;
  deactivateExpense: (id: string) => void;
  addOneTimeExpense: (amount: number) => void;
  addDebt: (debt: DebtState) => void;
  setRetired: (withdrawalMonthly: number) => void;
  setCrashYear: (rate: number) => void;
}

function applyLifeEvent(ev: LifeEvent, handlers: LifeEventHandlers): void {
  switch (ev.type) {
    case "job_change":
      handlers.addIncomeAdjustment(ev.incomeDeltaMonthly ?? 0);
      break;
    case "child":
      handlers.addExpense({ id: `event-${ev.id}`, monthlyAmount: ev.expenseDeltaMonthly ?? 0, active: true });
      break;
    case "home_purchase":
      if (ev.oneTimeCost) handlers.addOneTimeExpense(ev.oneTimeCost);
      if (ev.newMortgage) {
        handlers.addDebt({
          id: `event-${ev.id}`,
          balance: ev.newMortgage.principal,
          annualInterestRate: ev.newMortgage.annualInterestRate,
          minimumPayment: ev.newMortgage.minimumPayment,
        });
      }
      if (ev.removedExpenseId) handlers.deactivateExpense(ev.removedExpenseId);
      break;
    case "retirement":
      handlers.setRetired(ev.retirementWithdrawalMonthly ?? 0);
      break;
    case "market_crash":
      handlers.setCrashYear(ev.crashReturnRate ?? -0.3);
      break;
  }
}
