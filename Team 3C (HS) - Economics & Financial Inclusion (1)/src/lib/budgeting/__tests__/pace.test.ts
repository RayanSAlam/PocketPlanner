import { describe, it, expect } from "vitest";
import { computePaceStatus, computeMonthHealth, computeSafeToSpend } from "@/lib/budgeting/pace";

describe("computePaceStatus", () => {
  it("flags on-pace spending near the linear expectation", () => {
    // Day 10 of 30 -> expect 1/3 of $300 = $100 spent.
    const result = computePaceStatus(102, 300, 10, 30);
    expect(result.status).toBe("on-pace");
    expect(result.percentOver).toBe(0);
  });

  it("flags under-spending", () => {
    const result = computePaceStatus(50, 300, 10, 30);
    expect(result.status).toBe("under");
  });

  it("flags over-spending with the correct percent", () => {
    // Expected $100, actual $150 -> 50% over.
    const result = computePaceStatus(150, 300, 10, 30);
    expect(result.status).toBe("over");
    expect(result.percentOver).toBe(50);
  });

  it("treats a zero budget with any spend as over", () => {
    expect(computePaceStatus(10, 0, 10, 30).status).toBe("over");
    expect(computePaceStatus(0, 0, 10, 30).status).toBe("on-pace");
  });

  it("treats day 1 correctly without dividing by zero", () => {
    // Day 1 of 30 -> expected ~$10, spent $5 -> under.
    const result = computePaceStatus(5, 300, 1, 30);
    expect(result.status).toBe("under");
  });
});

describe("computeMonthHealth", () => {
  it("is green when under or on pace", () => {
    expect(computeMonthHealth(90, 300, 10, 30)).toBe("green");
  });

  it("is amber for a moderate overspend", () => {
    // Expected $100, spent $110 -> 10% over -> amber (<=15%)
    expect(computeMonthHealth(110, 300, 10, 30)).toBe("amber");
  });

  it("is red for a large overspend", () => {
    // Expected $100, spent $200 -> 100% over -> red
    expect(computeMonthHealth(200, 300, 10, 30)).toBe("red");
  });
});

describe("computeSafeToSpend", () => {
  const lines = [
    { groupName: "Needs", amountBudgeted: 1000, spent: 500 },
    { groupName: "Wants", amountBudgeted: 400, spent: 100 },
    { groupName: "Wants", amountBudgeted: 200, spent: 50 },
  ];

  it("only counts non-fixed (non-Needs) lines toward remaining flexible spend", () => {
    const result = computeSafeToSpend(lines, 10);
    // Wants remaining: (400-100) + (200-50) = 450
    expect(result.remainingFlexible).toBe(450);
    expect(result.perDay).toBe(45);
  });

  it("clamps days remaining to at least 1", () => {
    const result = computeSafeToSpend(lines, 0);
    expect(result.daysRemaining).toBe(1);
  });

  it("never returns a negative per-day amount when overspent", () => {
    const overspent = [{ groupName: "Wants", amountBudgeted: 100, spent: 250 }];
    const result = computeSafeToSpend(overspent, 5);
    expect(result.perDay).toBe(0);
    expect(result.remainingFlexible).toBe(-150);
  });
});
