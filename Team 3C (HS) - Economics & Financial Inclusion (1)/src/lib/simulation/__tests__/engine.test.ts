import { describe, it, expect } from "vitest";
import { runSimulation } from "@/lib/simulation/engine";
import type { SimulationInput, LifeEvent } from "@/lib/simulation/types";

const baseSettings = {
  horizonYears: 1,
  granularity: "monthly" as const,
  inflationRate: 0,
  taxRate: 0,
  realDollars: false,
  payoffStrategy: "avalanche" as const,
  monteCarloEnabled: false,
};

function makeInput(overrides: Partial<SimulationInput>): SimulationInput {
  return {
    incomeStreams: [],
    oneTimeIncome: [],
    expenses: [],
    oneTimeExpenses: [],
    buckets: [],
    debts: [],
    lifeEvents: [],
    settings: baseSettings,
    ...overrides,
  };
}

describe("runSimulation — basic compound growth", () => {
  it("compounds a single bucket with no contribution to exactly balance*(1+annualRate) after 12 months", () => {
    const input = makeInput({
      buckets: [{ id: "b", label: "Brokerage", kind: "brokerage", balance: 1000, annualReturnRate: 0.06, monthlyContribution: 0 }],
    });
    const results = runSimulation(input);
    expect(results).toHaveLength(12);
    expect(results[11].totalSavings).toBeCloseTo(1060, 6);
    expect(results[11].netWorth).toBeCloseTo(1060, 6);
  });

  it("produces flat income/expenses when there's no growth or inflation", () => {
    const input = makeInput({
      incomeStreams: [{ id: "salary", label: "Salary", monthlyAmount: 5000, annualGrowthRate: 0 }],
      expenses: [{ id: "rent", label: "Rent", monthlyAmount: 2000, kind: "fixed" }],
    });
    const results = runSimulation(input);
    expect(results[0].netIncome).toBe(5000);
    expect(results[0].totalExpenses).toBe(2000);
    expect(results[0].netCashFlow).toBe(3000);
    expect(results[11].netIncome).toBe(5000); // no growth rate, stays flat
  });

  it("applies a flat tax rate to gross income", () => {
    const input = makeInput({ incomeStreams: [{ id: "salary", label: "Salary", monthlyAmount: 5000, annualGrowthRate: 0 }], settings: { ...baseSettings, taxRate: 0.2 } });
    const results = runSimulation(input);
    expect(results[0].netIncome).toBeCloseTo(4000, 6);
  });

  it("grows income annually by each stream's own growth rate at year boundaries", () => {
    const input = makeInput({
      incomeStreams: [{ id: "salary", label: "Salary", monthlyAmount: 4000, annualGrowthRate: 0.1 }],
      settings: { ...baseSettings, horizonYears: 2 },
    });
    const results = runSimulation(input);
    expect(results[0].grossIncome).toBe(4000); // year 1: unchanged
    expect(results[11].grossIncome).toBe(4000); // still year 1 (month index 11)
    expect(results[12].grossIncome).toBeCloseTo(4400, 6); // year 2: grown by 10%
  });
});

describe("runSimulation — debt payoff integration", () => {
  it("reduces debt over time and reports the amount paid each period", () => {
    const input = makeInput({ debts: [{ id: "loan", label: "Loan", principal: 5000, annualInterestRate: 0.1, minimumPayment: 200, extraPayment: 0 }] });
    const results = runSimulation(input);
    expect(results[0].totalDebt).toBeLessThan(5000);
    expect(results[0].debtPaidThisPeriod).toBeCloseTo(200, 6);
    expect(results[11].totalDebt).toBeLessThan(results[0].totalDebt);
  });

  it("has zero debt throughout when no debts are configured (edge case)", () => {
    const input = makeInput({});
    const results = runSimulation(input);
    for (const step of results) {
      expect(step.totalDebt).toBe(0);
      expect(step.debtPaidThisPeriod).toBe(0);
    }
  });
});

describe("runSimulation — life events", () => {
  it("job_change adds a permanent income delta starting the year it fires", () => {
    const event: LifeEvent = { id: "raise", type: "job_change", year: 1, label: "New job", incomeDeltaMonthly: 1000 };
    const input = makeInput({
      incomeStreams: [{ id: "salary", label: "Salary", monthlyAmount: 4000, annualGrowthRate: 0 }],
      lifeEvents: [event],
      settings: { ...baseSettings, horizonYears: 2 },
    });
    const results = runSimulation(input);
    expect(results[11].grossIncome).toBe(4000); // year 1: before the event
    expect(results[12].grossIncome).toBe(5000); // year 2: event fires, +1000
  });

  it("child adds a recurring expense starting the year it fires", () => {
    const event: LifeEvent = { id: "baby", type: "child", year: 1, label: "New baby", expenseDeltaMonthly: 800 };
    const input = makeInput({ lifeEvents: [event], settings: { ...baseSettings, horizonYears: 2 } });
    const results = runSimulation(input);
    expect(results[11].totalExpenses).toBe(0);
    expect(results[12].totalExpenses).toBe(800);
    expect(results[23].totalExpenses).toBe(800); // persists
  });

  it("retirement zeroes out income streams and replaces them with a fixed withdrawal", () => {
    const event: LifeEvent = { id: "retire", type: "retirement", year: 1, label: "Retire", retirementWithdrawalMonthly: 3000 };
    const input = makeInput({
      incomeStreams: [{ id: "salary", label: "Salary", monthlyAmount: 6000, annualGrowthRate: 0 }],
      lifeEvents: [event],
      settings: { ...baseSettings, horizonYears: 2 },
    });
    const results = runSimulation(input);
    expect(results[11].grossIncome).toBe(6000);
    expect(results[12].grossIncome).toBe(3000);
  });

  it("market_crash overrides bucket growth for exactly the year it fires", () => {
    const event: LifeEvent = { id: "crash", type: "market_crash", year: 1, label: "Crash", crashReturnRate: -0.5 };
    const input = makeInput({
      buckets: [{ id: "b", label: "Brokerage", kind: "brokerage", balance: 10000, annualReturnRate: 0.07, monthlyContribution: 0 }],
      lifeEvents: [event],
      settings: { ...baseSettings, horizonYears: 2 },
    });
    const results = runSimulation(input);
    expect(results[11].totalSavings).toBeGreaterThan(10000); // normal growth in year 1
    expect(results[12].totalSavings).toBeLessThan(results[11].totalSavings); // crash hits in year 2
  });

  it("home_purchase adds a one-time cost, a new mortgage debt, and can remove an existing expense (rent)", () => {
    const event: LifeEvent = {
      id: "buy-house",
      type: "home_purchase",
      year: 1,
      label: "Bought a house",
      oneTimeCost: 20000,
      newMortgage: { principal: 300000, annualInterestRate: 0.06, minimumPayment: 1800 },
      removedExpenseId: "rent",
    };
    const input = makeInput({
      expenses: [{ id: "rent", label: "Rent", monthlyAmount: 1500, kind: "fixed" }],
      lifeEvents: [event],
      settings: { ...baseSettings, horizonYears: 2 },
    });
    const results = runSimulation(input);
    expect(results[11].totalExpenses).toBe(1500); // still paying rent in year 1
    expect(results[11].totalDebt).toBe(0); // no mortgage yet
    expect(results[12].totalExpenses).toBe(20000); // one-time down payment spike the month it fires
    expect(results[13].totalExpenses).toBe(0); // rent gone, no more one-time cost
    expect(results[13].totalDebt).toBeGreaterThan(0);
    expect(results[13].totalDebt).toBeLessThan(300000); // already had one payment applied
  });
});

describe("runSimulation — edge cases", () => {
  it("handles a 1-year horizon with everything empty without throwing", () => {
    const results = runSimulation(makeInput({ settings: { ...baseSettings, horizonYears: 1 } }));
    expect(results).toHaveLength(12);
    for (const step of results) {
      expect(step.netWorth).toBe(0);
    }
  });

  it("rounds a fractional horizon to whole months and never returns zero steps", () => {
    const results = runSimulation(makeInput({ settings: { ...baseSettings, horizonYears: 0.4 } }));
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("runSimulation — returnRateOverride (Monte Carlo hook)", () => {
  it("uses the override rate instead of the bucket's static rate when provided", () => {
    const input = makeInput({
      buckets: [{ id: "b", label: "Brokerage", kind: "brokerage", balance: 1000, annualReturnRate: 0.06, monthlyContribution: 0 }],
    });
    // Override always returns 0% growth, regardless of the bucket's configured 6%.
    const results = runSimulation(input, { returnRateOverride: () => 0 });
    expect(results[11].totalSavings).toBeCloseTo(1000, 6); // no growth at all
  });

  it("passes the bucket id, year, and the bucket's own default rate to the override function", () => {
    const input = makeInput({
      buckets: [{ id: "b", label: "Brokerage", kind: "brokerage", balance: 1000, annualReturnRate: 0.06, monthlyContribution: 0 }],
    });
    const calls: Array<[string, number, number]> = [];
    runSimulation(input, {
      returnRateOverride: (bucketId, year, defaultRate) => {
        calls.push([bucketId, year, defaultRate]);
        return defaultRate;
      },
    });
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]).toEqual(["b", 0, 0.06]);
  });

  it("still lets a market_crash event override the override for its year", () => {
    const event: LifeEvent = { id: "crash", type: "market_crash", year: 0, label: "Crash", crashReturnRate: -0.9 };
    const input = makeInput({
      buckets: [{ id: "b", label: "Brokerage", kind: "brokerage", balance: 10000, annualReturnRate: 0.06, monthlyContribution: 0 }],
      lifeEvents: [event],
    });
    // Override would normally force +50% growth, but the crash event for
    // this year must still win — crash protection can't be Monte-Carlo'd away.
    const results = runSimulation(input, { returnRateOverride: () => 0.5 });
    expect(results[11].totalSavings).toBeLessThan(10000);
  });
});
