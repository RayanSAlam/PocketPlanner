import { describe, it, expect } from "vitest";
import { stepDebts, type DebtState } from "@/lib/simulation/debt";

describe("stepDebts", () => {
  it("applies minimum payments and accrues interest at APR/12 (simple periodic rate)", () => {
    const debts: DebtState[] = [{ id: "a", balance: 1000, annualInterestRate: 0.12, minimumPayment: 100 }];
    const { debts: next } = stepDebts(debts, 0, "avalanche");
    // interest = 1000 * (0.12/12) = 10; payment = 100; new balance = 1000+10-100 = 910
    expect(next[0].balance).toBeCloseTo(910, 5);
  });

  it("avalanche sends the extra budget to the highest-rate debt first", () => {
    const debts: DebtState[] = [
      { id: "low-rate", balance: 5000, annualInterestRate: 0.05, minimumPayment: 50 },
      { id: "high-rate", balance: 2000, annualInterestRate: 0.22, minimumPayment: 50 },
    ];
    const { debts: next } = stepDebts(debts, 500, "avalanche");
    const highRate = next.find((d) => d.id === "high-rate")!;
    const lowRate = next.find((d) => d.id === "low-rate")!;
    // high-rate debt: interest = 2000*0.22/12 ≈ 36.67; owed ≈ 2036.67; min 50 + extra up to remaining 500
    // capacity after min = 1986.67, extra (500) fully absorbed there, none left for low-rate
    expect(highRate.balance).toBeLessThan(2000 - 500); // paid down aggressively
    expect(lowRate.balance).toBeCloseTo(5000 + (5000 * 0.05) / 12 - 50, 2); // only got minimum payment
  });

  it("snowball sends the extra budget to the smallest balance first, with a partial extra budget", () => {
    const debts: DebtState[] = [
      { id: "big", balance: 8000, annualInterestRate: 0.18, minimumPayment: 80 },
      { id: "small", balance: 500, annualInterestRate: 0.05, minimumPayment: 25 },
    ];
    // small's payoff capacity this month is ~477.08 (owed 502.08 minus its 25 minimum),
    // so a 200 extra budget goes entirely to "small" with nothing left to roll to "big".
    const { debts: next } = stepDebts(debts, 200, "snowball");
    const small = next.find((d) => d.id === "small")!;
    const big = next.find((d) => d.id === "big")!;
    expect(small.balance).toBeCloseTo(500 + 500 * (0.05 / 12) - 25 - 200, 2);
    const bigInterest = (8000 * 0.18) / 12;
    expect(big.balance).toBeCloseTo(8000 + bigInterest - 80, 2); // only the minimum — no extra left to roll over
  });

  it("snowball rolls leftover extra budget to the next debt once the smallest is paid off", () => {
    const debts: DebtState[] = [
      { id: "big", balance: 8000, annualInterestRate: 0.18, minimumPayment: 80 },
      { id: "small", balance: 500, annualInterestRate: 0.05, minimumPayment: 25 },
    ];
    // small's full payoff capacity is ~477.08; a 600 extra budget covers that with ~122.92 left over for "big".
    const { debts: next } = stepDebts(debts, 600, "snowball");
    const small = next.find((d) => d.id === "small")!;
    const big = next.find((d) => d.id === "big")!;
    expect(small.balance).toBe(0);
    const bigInterest = (8000 * 0.18) / 12;
    const bigWithOnlyMinimum = 8000 + bigInterest - 80;
    expect(big.balance).toBeLessThan(bigWithOnlyMinimum); // got the ~122.92 rollover too
    expect(big.balance).toBeCloseTo(bigWithOnlyMinimum - (600 - (500 + 500 * (0.05 / 12) - 25)), 2);
  });

  it("never lets a balance go negative and leaves paid-off debts at zero", () => {
    const debts: DebtState[] = [{ id: "almost-done", balance: 40, annualInterestRate: 0.1, minimumPayment: 100 }];
    const { debts: next } = stepDebts(debts, 0, "avalanche");
    expect(next[0].balance).toBe(0);
  });

  it("leaves already-settled debts untouched at zero", () => {
    const debts: DebtState[] = [{ id: "done", balance: 0, annualInterestRate: 0.1, minimumPayment: 50 }];
    const { debts: next, totalPaid } = stepDebts(debts, 300, "avalanche");
    expect(next[0].balance).toBe(0);
    expect(totalPaid).toBe(0); // no active debt to absorb the extra budget
  });
});
