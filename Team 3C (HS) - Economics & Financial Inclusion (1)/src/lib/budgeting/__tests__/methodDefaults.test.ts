import { describe, it, expect } from "vitest";
import { computeMethodAllocation, roundFriendly, DEFAULT_EXPENSE_SLUGS, GROUP_BY_SLUG } from "@/lib/budgeting/methodDefaults";

describe("roundFriendly", () => {
  it("rounds up to the nearest $25", () => {
    expect(roundFriendly(180)).toBe(200);
    expect(roundFriendly(25)).toBe(25);
    expect(roundFriendly(26)).toBe(50);
    expect(roundFriendly(0)).toBe(0);
  });

  it("floors negative/zero to 0", () => {
    expect(roundFriendly(-10)).toBe(0);
  });

  it("does not bump an already-exact multiple of 25 up to the next one due to float noise", () => {
    // 5000 * 0.28 === 1400.0000000000002 in JS float arithmetic — this
    // caught a real bug where the wizard showed $1,425 for a 28% line
    // that should have landed exactly on $1,400.
    expect(roundFriendly(5000 * 0.28)).toBe(1400);
    expect(roundFriendly(4000 * 0.1)).toBe(400);
  });
});

describe("computeMethodAllocation", () => {
  it("covers every default expense category exactly once", () => {
    const lines = computeMethodAllocation("custom", 5000);
    expect(lines).toHaveLength(DEFAULT_EXPENSE_SLUGS.length);
    expect(new Set(lines.map((l) => l.slug)).size).toBe(DEFAULT_EXPENSE_SLUGS.length);
  });

  it("assigns the correct Needs/Wants group per category", () => {
    const lines = computeMethodAllocation("fifty_thirty_twenty", 5000);
    for (const line of lines) {
      expect(line.group).toBe(GROUP_BY_SLUG[line.slug]);
    }
  });

  it("uses percentage defaults with no history", () => {
    const lines = computeMethodAllocation("custom", 5000);
    const housing = lines.find((l) => l.slug === "housing")!;
    expect(housing.basedOnHistory).toBe(false);
    expect(housing.amountBudgeted).toBe(roundFriendly(5000 * 0.28));
  });

  it("prefers historical averages over percentage defaults when present", () => {
    const lines = computeMethodAllocation("custom", 5000, { housing: 180 });
    const housing = lines.find((l) => l.slug === "housing")!;
    expect(housing.basedOnHistory).toBe(true);
    expect(housing.amountBudgeted).toBe(200); // 180 rounded up to nearest $25

    const food = lines.find((l) => l.slug === "food")!;
    expect(food.basedOnHistory).toBe(false);
  });

  it("scales zero-based allocations to sum to income (within a cent of rounding drift per line)", () => {
    const income = 5000;
    const lines = computeMethodAllocation("zero_based", income);
    const total = lines.reduce((s, l) => s + l.amountBudgeted, 0);
    expect(Math.abs(total - income)).toBeLessThan(0.01 * lines.length);
  });

  it("does not scale non-zero-based methods to income", () => {
    const income = 5000;
    const lines = computeMethodAllocation("fifty_thirty_twenty", income);
    const total = lines.reduce((s, l) => s + l.amountBudgeted, 0);
    expect(total).toBeLessThan(income);
  });

  it("handles zero income without dividing by zero", () => {
    const lines = computeMethodAllocation("zero_based", 0);
    expect(lines.every((l) => l.amountBudgeted === 0)).toBe(true);
  });
});
