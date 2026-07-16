import { describe, it, expect } from "vitest";
import {
  computeGoalProgress,
  computeRequiredMonthlyContribution,
  computeProjectedCompletion,
  computeAvgMonthlyContribution,
  getNewlyCrossedMilestones,
} from "@/lib/budgeting/goals";

describe("computeGoalProgress — save goals", () => {
  it("adds contributions on top of the starting amount", () => {
    const result = computeGoalProgress({ type: "save", target_amount: 2500, starting_amount: 500 }, 1000);
    expect(result.current).toBe(1500);
    expect(result.percent).toBe(60);
    expect(result.remaining).toBe(1000);
  });

  it("clamps percent at 100 when overshooting the target", () => {
    const result = computeGoalProgress({ type: "save", target_amount: 1000, starting_amount: 0 }, 1500);
    expect(result.percent).toBe(100);
    expect(result.remaining).toBe(0);
  });

  it("handles a zero target without dividing by zero", () => {
    const result = computeGoalProgress({ type: "save", target_amount: 0, starting_amount: 0 }, 100);
    expect(result.percent).toBe(0);
  });
});

describe("computeGoalProgress — paydown goals", () => {
  it("reduces the remaining balance as contributions are paid", () => {
    // $5,000 credit card debt, target $0, paid off $3,000 so far.
    const result = computeGoalProgress({ type: "paydown", target_amount: 0, starting_amount: 5000 }, 3000);
    expect(result.current).toBe(2000); // remaining balance
    expect(result.percent).toBe(60);
    expect(result.remaining).toBe(2000);
  });

  it("supports a nonzero payoff target (e.g. 'get this card under $1,000')", () => {
    const result = computeGoalProgress({ type: "paydown", target_amount: 1000, starting_amount: 5000 }, 3000);
    // span = 4000, paid = 3000 -> 75%
    expect(result.percent).toBe(75);
    expect(result.current).toBe(2000);
  });

  it("never pays the balance below the target even if overpaid", () => {
    const result = computeGoalProgress({ type: "paydown", target_amount: 0, starting_amount: 1000 }, 1500);
    expect(result.current).toBe(0);
    expect(result.percent).toBe(100);
    expect(result.remaining).toBe(0);
  });
});

describe("computeRequiredMonthlyContribution", () => {
  it("computes the amount needed per month to hit the target date", () => {
    const from = new Date(2026, 6, 14); // July 14
    const target = "2026-12-14"; // exactly 5 months later
    const result = computeRequiredMonthlyContribution(1000, target, from);
    expect(result).toBe(200);
  });

  it("returns null when already achieved", () => {
    expect(computeRequiredMonthlyContribution(0, "2026-12-14")).toBeNull();
    expect(computeRequiredMonthlyContribution(-10, "2026-12-14")).toBeNull();
  });

  it("returns null when there's no target date", () => {
    expect(computeRequiredMonthlyContribution(1000, null)).toBeNull();
  });

  it("returns null when the target date has already passed", () => {
    const from = new Date(2026, 6, 14);
    expect(computeRequiredMonthlyContribution(1000, "2026-01-01", from)).toBeNull();
  });
});

describe("computeProjectedCompletion", () => {
  it("projects forward from the average monthly pace", () => {
    const from = new Date(2026, 6, 1);
    // $1000 remaining at $250/mo -> 4 months -> Nov 2026
    const result = computeProjectedCompletion(1000, 250, from);
    expect(result).toBe("2026-11-01");
  });

  it("returns null with no measurable pace", () => {
    expect(computeProjectedCompletion(1000, 0)).toBeNull();
    expect(computeProjectedCompletion(1000, -5)).toBeNull();
  });

  it("returns null when already complete", () => {
    expect(computeProjectedCompletion(0, 100)).toBeNull();
  });
});

describe("computeAvgMonthlyContribution", () => {
  it("returns 0 with no contributions", () => {
    expect(computeAvgMonthlyContribution([])).toBe(0);
  });

  it("divides total by the span since the earliest contribution", () => {
    const from = new Date(2026, 6, 1); // July 1
    const contributions = [
      { amount: 100, date: "2026-05-01" },
      { amount: 100, date: "2026-06-01" },
      { amount: 100, date: "2026-07-01" },
    ];
    // Span from May 1 to July 1 = 2 months -> $300 / 2 = $150/mo
    expect(computeAvgMonthlyContribution(contributions, from)).toBe(150);
  });

  it("floors the span at 1 month so a same-day contribution doesn't divide by ~0", () => {
    const from = new Date(2026, 6, 14);
    const contributions = [{ amount: 50, date: "2026-07-14" }];
    expect(computeAvgMonthlyContribution(contributions, from)).toBe(50);
  });
});

describe("getNewlyCrossedMilestones", () => {
  it("detects a single newly-crossed milestone", () => {
    expect(getNewlyCrossedMilestones(20, 30)).toEqual([25]);
  });

  it("detects multiple milestones crossed in one jump", () => {
    expect(getNewlyCrossedMilestones(10, 80)).toEqual([25, 50, 75]);
  });

  it("returns nothing when no new milestone is crossed", () => {
    expect(getNewlyCrossedMilestones(30, 40)).toEqual([]);
  });

  it("detects hitting exactly 100%", () => {
    expect(getNewlyCrossedMilestones(90, 100)).toEqual([100]);
  });
});
