export type Granularity = "monthly" | "yearly";
export type PayoffStrategy = "avalanche" | "snowball";
export type LifeEventType = "job_change" | "child" | "home_purchase" | "retirement" | "market_crash";
export type BucketKind = "cash" | "retirement" | "brokerage" | "savings";
export type ExpenseKind = "fixed" | "discretionary";

export interface IncomeStream {
  id: string;
  label: string;
  monthlyAmount: number;
  annualGrowthRate: number; // e.g. 0.03 = 3%/yr
}

export interface ExpenseItem {
  id: string;
  label: string;
  monthlyAmount: number;
  kind: ExpenseKind;
}

// A one-time inflow/outflow scheduled for a specific year of the simulation
// (bonus, inheritance, buying a car, a wedding, etc).
export interface OneTimeAmount {
  id: string;
  label: string;
  amount: number; // always positive; sign is implied by which array it's in
  year: number; // 0-based offset from simulation start
}

export interface AccountBucket {
  id: string;
  label: string;
  kind: BucketKind;
  balance: number;
  annualReturnRate: number;
  monthlyContribution: number;
}

export interface Debt {
  id: string;
  label: string;
  principal: number;
  annualInterestRate: number;
  minimumPayment: number;
  extraPayment: number;
}

export interface LifeEvent {
  id: string;
  type: LifeEventType;
  year: number; // 0-based, event fires at the first month of this year
  label: string;
  // type-specific payloads — only the fields relevant to `type` are read
  incomeDeltaMonthly?: number; // job_change: added to total monthly income going forward
  expenseDeltaMonthly?: number; // child: added to total monthly expenses going forward
  oneTimeCost?: number; // home_purchase: one-time cash outlay (down payment etc.)
  newMortgage?: { principal: number; annualInterestRate: number; minimumPayment: number }; // home_purchase
  removedExpenseId?: string; // home_purchase: stop paying this expense (e.g. rent) going forward
  retirementWithdrawalMonthly?: number; // retirement: income streams stop, this fixed withdrawal begins
  crashReturnRate?: number; // market_crash: overrides every bucket's return rate for this one year (e.g. -0.30)
}

export interface SimulationSettings {
  horizonYears: number; // 1-40
  granularity: Granularity; // display resolution — engine always computes monthly internally
  inflationRate: number; // applied to all expenses uniformly
  taxRate: number; // flat rate, 0-1
  realDollars: boolean; // display transform only, doesn't change engine math
  payoffStrategy: PayoffStrategy;
  monteCarloEnabled: boolean;
}

export interface SimulationInput {
  incomeStreams: IncomeStream[];
  oneTimeIncome: OneTimeAmount[];
  expenses: ExpenseItem[];
  oneTimeExpenses: OneTimeAmount[];
  buckets: AccountBucket[];
  debts: Debt[];
  lifeEvents: LifeEvent[];
  settings: SimulationSettings;
}

export interface TimeStep {
  month: number; // 0-based absolute month index from simulation start
  year: number; // Math.floor(month / 12)
  grossIncome: number;
  netIncome: number; // after flat-rate tax
  totalExpenses: number;
  netCashFlow: number; // netIncome - totalExpenses - totalDebtPayment - totalBucketContributions
  bucketBalances: Record<string, number>;
  totalSavings: number;
  debtBalances: Record<string, number>;
  totalDebt: number;
  debtPaidThisPeriod: number;
  netWorth: number; // totalSavings - totalDebt
}

export type SimulationOutput = TimeStep[];
