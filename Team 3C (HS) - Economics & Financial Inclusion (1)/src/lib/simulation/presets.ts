import type { SimulationInput } from "@/lib/simulation/types";

const baseSettings = {
  granularity: "yearly" as const,
  inflationRate: 0.03,
  taxRate: 0.22,
  realDollars: false,
  payoffStrategy: "avalanche" as const,
  monteCarloEnabled: false,
};

export interface PresetDefinition {
  id: string;
  label: string;
  description: string;
  input: SimulationInput;
}

export const PRESETS: PresetDefinition[] = [
  {
    id: "recent-grad",
    label: "Recent Grad",
    description: "First job, student loans, just starting to save.",
    input: {
      incomeStreams: [{ id: "salary", label: "Salary", monthlyAmount: 4200, annualGrowthRate: 0.04 }],
      oneTimeIncome: [],
      expenses: [
        { id: "rent", label: "Rent", monthlyAmount: 1400, kind: "fixed" },
        { id: "living", label: "Living expenses", monthlyAmount: 900, kind: "discretionary" },
      ],
      oneTimeExpenses: [],
      buckets: [
        { id: "emergency", label: "Emergency fund", kind: "cash", balance: 1500, annualReturnRate: 0.04, monthlyContribution: 150 },
        { id: "retirement", label: "401(k)", kind: "retirement", balance: 2000, annualReturnRate: 0.07, monthlyContribution: 300 },
      ],
      debts: [{ id: "student-loan", label: "Student loans", principal: 28000, annualInterestRate: 0.055, minimumPayment: 300, extraPayment: 50 }],
      lifeEvents: [],
      settings: { ...baseSettings, horizonYears: 15 },
    },
  },
  {
    id: "growing-family",
    label: "Growing Family",
    description: "Dual income, a mortgage, and a kid on the way.",
    input: {
      incomeStreams: [
        { id: "salary-1", label: "Salary 1", monthlyAmount: 6500, annualGrowthRate: 0.03 },
        { id: "salary-2", label: "Salary 2", monthlyAmount: 5200, annualGrowthRate: 0.03 },
      ],
      oneTimeIncome: [],
      expenses: [
        { id: "mortgage-pmt", label: "Mortgage & housing costs", monthlyAmount: 2600, kind: "fixed" },
        { id: "living", label: "Living expenses", monthlyAmount: 2200, kind: "discretionary" },
      ],
      oneTimeExpenses: [],
      buckets: [
        { id: "emergency", label: "Emergency fund", kind: "cash", balance: 15000, annualReturnRate: 0.04, monthlyContribution: 200 },
        { id: "retirement", label: "401(k)", kind: "retirement", balance: 65000, annualReturnRate: 0.07, monthlyContribution: 900 },
        { id: "brokerage", label: "Brokerage", kind: "brokerage", balance: 10000, annualReturnRate: 0.065, monthlyContribution: 300 },
      ],
      debts: [{ id: "mortgage", label: "Mortgage", principal: 380000, annualInterestRate: 0.065, minimumPayment: 2100, extraPayment: 0 }],
      lifeEvents: [{ id: "new-child", type: "child", year: 1, label: "New baby", expenseDeltaMonthly: 850 }],
      settings: { ...baseSettings, horizonYears: 25 },
    },
  },
  {
    id: "nearing-retirement",
    label: "Nearing Retirement",
    description: "Peak earning years, maxing out retirement contributions.",
    input: {
      incomeStreams: [{ id: "salary", label: "Salary", monthlyAmount: 11000, annualGrowthRate: 0.02 }],
      oneTimeIncome: [],
      expenses: [
        { id: "housing", label: "Housing", monthlyAmount: 2200, kind: "fixed" },
        { id: "living", label: "Living expenses", monthlyAmount: 3000, kind: "discretionary" },
      ],
      oneTimeExpenses: [],
      buckets: [
        { id: "retirement", label: "401(k) & IRA", kind: "retirement", balance: 620000, annualReturnRate: 0.065, monthlyContribution: 2500 },
        { id: "brokerage", label: "Brokerage", kind: "brokerage", balance: 180000, annualReturnRate: 0.06, monthlyContribution: 800 },
        { id: "savings", label: "High-yield savings", kind: "savings", balance: 40000, annualReturnRate: 0.045, monthlyContribution: 200 },
      ],
      debts: [],
      lifeEvents: [{ id: "retire", type: "retirement", year: 8, label: "Retirement", retirementWithdrawalMonthly: 6500 }],
      settings: { ...baseSettings, horizonYears: 30, taxRate: 0.28 },
    },
  },
  {
    id: "aggressive-fire",
    label: "Aggressive FIRE",
    description: "High savings rate, minimal expenses, early retirement target.",
    input: {
      incomeStreams: [{ id: "salary", label: "Salary", monthlyAmount: 8500, annualGrowthRate: 0.035 }],
      oneTimeIncome: [],
      expenses: [
        { id: "housing", label: "Housing", monthlyAmount: 1300, kind: "fixed" },
        { id: "living", label: "Living expenses", monthlyAmount: 1400, kind: "discretionary" },
      ],
      oneTimeExpenses: [],
      buckets: [
        { id: "retirement", label: "401(k)", kind: "retirement", balance: 40000, annualReturnRate: 0.075, monthlyContribution: 2000 },
        { id: "brokerage", label: "Brokerage", kind: "brokerage", balance: 25000, annualReturnRate: 0.07, monthlyContribution: 2500 },
      ],
      debts: [],
      lifeEvents: [],
      settings: { ...baseSettings, horizonYears: 20, taxRate: 0.24 },
    },
  },
];

export function getPreset(id: string): PresetDefinition | undefined {
  return PRESETS.find((p) => p.id === id);
}
