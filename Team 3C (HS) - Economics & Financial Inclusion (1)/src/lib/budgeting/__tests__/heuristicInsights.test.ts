import { describe, it, expect } from "vitest";
import { computeHeuristicInsights, type InsightCategoryData } from "@/lib/budgeting/heuristicInsights";

function cat(overrides: Partial<InsightCategoryData>): InsightCategoryData {
  return { categoryId: "c1", categoryName: "Dining", amountBudgeted: 300, spent: 100, pctUsed: 33, history: [], ...overrides };
}

describe("computeHeuristicInsights", () => {
  it("flags a category over budget three months running", () => {
    const result = computeHeuristicInsights([cat({ amountBudgeted: 300, spent: 350, history: [320, 330] })], 5000);
    const warning = result.find((i) => i.type === "warning" && i.message.includes("three months"));
    expect(warning).toBeDefined();
    expect(warning?.action?.type).toBe("adjust_budget");
  });

  it("does not flag over-budget when only one of three months was over", () => {
    const result = computeHeuristicInsights([cat({ amountBudgeted: 300, spent: 350, history: [200, 250] })], 5000);
    expect(result.find((i) => i.message.includes("three months"))).toBeUndefined();
  });

  it("flags subscription creep when spend climbs three months straight", () => {
    const result = computeHeuristicInsights([cat({ categoryName: "Subscriptions", amountBudgeted: 40, spent: 45, history: [30, 38] })], 5000);
    expect(result.some((i) => i.message.includes("crept up"))).toBe(true);
  });

  it("does not flag subscription creep when spend isn't monotonically increasing", () => {
    const result = computeHeuristicInsights([cat({ categoryName: "Subscriptions", amountBudgeted: 40, spent: 30, history: [35, 40] })], 5000);
    expect(result.some((i) => i.message.includes("crept up"))).toBe(false);
  });

  it("only checks subscription creep for subscription-flavored categories", () => {
    const result = computeHeuristicInsights([cat({ categoryName: "Entertainment", amountBudgeted: 40, spent: 45, history: [30, 38] })], 5000);
    expect(result.some((i) => i.message.includes("crept up"))).toBe(false);
  });

  it("suggests trimming a consistently under-used budget", () => {
    const result = computeHeuristicInsights([cat({ categoryName: "Entertainment", amountBudgeted: 200, spent: 50, history: [40, 45] })], 5000);
    const suggestion = result.find((i) => i.type === "suggestion");
    expect(suggestion).toBeDefined();
    expect(suggestion?.action?.suggested).toBeLessThan(200);
    expect(suggestion?.action?.suggested).toBeGreaterThan(45); // never suggests below actual typical spend
  });

  it("does not suggest trimming without enough history", () => {
    const result = computeHeuristicInsights([cat({ amountBudgeted: 200, spent: 50, history: [] })], 5000);
    expect(result.find((i) => i.type === "suggestion")).toBeUndefined();
  });

  it("does not suggest trimming when usage is only occasionally low", () => {
    const result = computeHeuristicInsights([cat({ amountBudgeted: 200, spent: 50, history: [180, 40] })], 5000);
    expect(result.find((i) => i.type === "suggestion")).toBeUndefined();
  });

  it("gives a win for a comfortably-under-budget category", () => {
    const result = computeHeuristicInsights([cat({ amountBudgeted: 300, spent: 100, pctUsed: 33 })], 5000);
    expect(result.some((i) => i.type === "win")).toBe(true);
  });

  it("caps wins at one even across multiple under-budget categories", () => {
    const cats = [
      cat({ categoryId: "c1", categoryName: "A", pctUsed: 20 }),
      cat({ categoryId: "c2", categoryName: "B", pctUsed: 25 }),
      cat({ categoryId: "c3", categoryName: "C", pctUsed: 30 }),
    ];
    const result = computeHeuristicInsights(cats, 5000);
    expect(result.filter((i) => i.type === "win")).toHaveLength(1);
  });

  it("returns at most 5 insights, warnings and suggestions prioritized over wins", () => {
    const cats = Array.from({ length: 6 }, (_, i) =>
      cat({ categoryId: `c${i}`, categoryName: `Cat${i}`, amountBudgeted: 300, spent: 350, history: [320, 330] }),
    );
    const result = computeHeuristicInsights(cats, 5000);
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result.every((i) => i.type === "warning")).toBe(true);
  });

  it("returns an empty list for a category with no signal (neither comfortably under nor over, no history)", () => {
    // 80% used doesn't clear the win threshold (<70%) and there's no
    // history to trigger a trend-based warning/suggestion.
    const result = computeHeuristicInsights([cat({ amountBudgeted: 300, spent: 240, pctUsed: 80, history: [] })], 5000);
    expect(result).toEqual([]);
  });
});
