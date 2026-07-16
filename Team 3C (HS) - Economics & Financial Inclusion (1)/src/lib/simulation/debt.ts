import type { PayoffStrategy } from "@/lib/simulation/types";

export interface DebtState {
  id: string;
  balance: number;
  annualInterestRate: number;
  minimumPayment: number;
}

export interface DebtStepResult {
  debts: DebtState[];
  totalPaid: number; // principal + interest paid across all debts this month
}

/**
 * One month of amortization across every debt, with the combined "extra"
 * budget (sum of each debt's user-set extra-payment amount) rolled toward
 * whichever debt the chosen strategy prioritizes — avalanche targets the
 * highest interest rate first, snowball targets the smallest balance first.
 * If the priority debt is paid off with less than the full extra budget,
 * the remainder rolls to the next debt in priority order within the same
 * month (the classic avalanche/snowball "rollover" behavior).
 *
 * Interest uses the loan-standard simple periodic rate (APR / 12), not the
 * effective-compounding rate used for savings growth — that's the actual
 * convention credit cards/mortgages/auto loans quote and amortize with.
 */
export function stepDebts(debts: DebtState[], extraBudget: number, strategy: PayoffStrategy): DebtStepResult {
  const active = debts.filter((d) => d.balance > 0);
  const settled = debts.filter((d) => d.balance <= 0);

  const ordered = [...active].sort((a, b) =>
    strategy === "avalanche" ? b.annualInterestRate - a.annualInterestRate : a.balance - b.balance,
  );

  let remainingExtra = Math.max(0, extraBudget);
  let totalPaid = 0;
  const next: DebtState[] = [];

  for (const debt of ordered) {
    const monthlyRate = debt.annualInterestRate / 12;
    const interestAccrued = debt.balance * monthlyRate;
    const amountOwed = debt.balance + interestAccrued;

    let payment = Math.min(debt.minimumPayment, amountOwed);
    const remainingCapacity = amountOwed - payment;
    if (remainingExtra > 0 && remainingCapacity > 0) {
      const applied = Math.min(remainingExtra, remainingCapacity);
      payment += applied;
      remainingExtra -= applied;
    }

    const newBalance = Math.max(0, amountOwed - payment);
    totalPaid += payment;
    next.push({ ...debt, balance: newBalance });
  }

  for (const debt of settled) {
    next.push({ ...debt, balance: 0 });
  }

  return { debts: next, totalPaid };
}
