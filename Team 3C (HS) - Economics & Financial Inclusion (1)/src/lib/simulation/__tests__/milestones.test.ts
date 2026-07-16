import { describe, it, expect } from "vitest";
import { detectMilestones } from "@/lib/simulation/milestones";
import { runSimulation } from "@/lib/simulation/engine";
import type { SimulationInput } from "@/lib/simulation/types";

const baseSettings = {
  horizonYears: 10,
  granularity: "yearly" as const,
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

describe("detectMilestones", () => {
  it("detects a debt-free date only when the scenario actually starts with debt", () => {
    const withDebt = makeInput({ debts: [{ id: "d", label: "Loan", principal: 2000, annualInterestRate: 0.1, minimumPayment: 500, extraPayment: 0 }] });
    const milestones = detectMilestones(runSimulation(withDebt), withDebt.buckets);
    const debtFree = milestones.find((m) => m.id === "debt-free");
    expect(debtFree).toBeDefined();

    const noDebt = makeInput({});
    const noDebtMilestones = detectMilestones(runSimulation(noDebt), noDebt.buckets);
    expect(noDebtMilestones.find((m) => m.id === "debt-free")).toBeUndefined();
  });

  it("detects net worth turning positive only when it starts at or below zero", () => {
    const startsNegative = makeInput({
      debts: [{ id: "d", label: "Loan", principal: 500, annualInterestRate: 0.05, minimumPayment: 100, extraPayment: 0 }],
      buckets: [{ id: "b", label: "Brokerage", kind: "brokerage", balance: 100, annualReturnRate: 0.07, monthlyContribution: 200 }],
    });
    const milestones = detectMilestones(runSimulation(startsNegative), startsNegative.buckets);
    expect(milestones.find((m) => m.id === "net-worth-positive")).toBeDefined();

    const startsPositive = makeInput({
      buckets: [{ id: "b", label: "Brokerage", kind: "brokerage", balance: 5000, annualReturnRate: 0.07, monthlyContribution: 100 }],
    });
    const positiveMilestones = detectMilestones(runSimulation(startsPositive), startsPositive.buckets);
    expect(positiveMilestones.find((m) => m.id === "net-worth-positive")).toBeUndefined();
  });

  it("detects the emergency fund milestone only for cash-kind buckets, once 3 months of expenses is reached", () => {
    const input = makeInput({
      expenses: [{ id: "e", label: "Rent", monthlyAmount: 1000, kind: "fixed" }],
      buckets: [{ id: "cash", label: "Emergency fund", kind: "cash", balance: 0, annualReturnRate: 0.02, monthlyContribution: 500 }],
    });
    const milestones = detectMilestones(runSimulation(input), input.buckets);
    const fund = milestones.find((m) => m.id === "emergency-fund-funded");
    expect(fund).toBeDefined();
    // Target ≈ 3000 (3x $1000 expenses); at $500/mo it should take ~6 months.
    expect(fund!.month).toBeLessThan(8);
  });

  it("ignores non-cash buckets for the emergency fund milestone", () => {
    const input = makeInput({
      expenses: [{ id: "e", label: "Rent", monthlyAmount: 1000, kind: "fixed" }],
      buckets: [{ id: "retirement", label: "401k", kind: "retirement", balance: 0, annualReturnRate: 0.07, monthlyContribution: 500 }],
    });
    const milestones = detectMilestones(runSimulation(input), input.buckets);
    expect(milestones.find((m) => m.id === "emergency-fund-funded")).toBeUndefined();
  });

  it("returns milestones sorted chronologically", () => {
    const input = makeInput({
      debts: [{ id: "d", label: "Loan", principal: 1000, annualInterestRate: 0.08, minimumPayment: 300, extraPayment: 0 }],
      buckets: [{ id: "b", label: "Brokerage", kind: "brokerage", balance: 0, annualReturnRate: 0.07, monthlyContribution: 300 }],
    });
    const milestones = detectMilestones(runSimulation(input), input.buckets);
    for (let i = 1; i < milestones.length; i++) {
      expect(milestones[i].month).toBeGreaterThanOrEqual(milestones[i - 1].month);
    }
  });
});
