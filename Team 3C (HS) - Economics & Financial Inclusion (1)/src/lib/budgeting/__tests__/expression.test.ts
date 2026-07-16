import { describe, it, expect } from "vitest";
import { evaluateBudgetExpression, looksLikeFormula } from "@/lib/budgeting/expression";

describe("evaluateBudgetExpression", () => {
  it("parses plain numbers", () => {
    expect(evaluateBudgetExpression("1200", 5000)).toBe(1200);
    expect(evaluateBudgetExpression("1200.5", 5000)).toBe(1200.5);
    expect(evaluateBudgetExpression("  85  ", 5000)).toBe(85);
  });

  it("strips a leading $ and thousands commas", () => {
    expect(evaluateBudgetExpression("$1,200", 5000)).toBe(1200);
    expect(evaluateBudgetExpression("$1,200.50", 5000)).toBe(1200.5);
  });

  it("evaluates basic arithmetic", () => {
    expect(evaluateBudgetExpression("1200/2", 5000)).toBe(600);
    expect(evaluateBudgetExpression("50*4", 5000)).toBe(200);
    expect(evaluateBudgetExpression("100+50-20", 5000)).toBe(130);
    expect(evaluateBudgetExpression("(100+50)*2", 5000)).toBe(300);
    expect(evaluateBudgetExpression("10*(2+3)/5", 5000)).toBe(10);
  });

  it("respects operator precedence without parens", () => {
    expect(evaluateBudgetExpression("2+3*4", 5000)).toBe(14);
    expect(evaluateBudgetExpression("20-4/2", 5000)).toBe(18);
  });

  it("handles unary minus", () => {
    expect(evaluateBudgetExpression("-50", 5000)).toBe(-50);
    expect(evaluateBudgetExpression("100 + -20", 5000)).toBe(80);
  });

  it("evaluates 'N% of income'", () => {
    expect(evaluateBudgetExpression("15% of income", 4000)).toBe(600);
    expect(evaluateBudgetExpression("20%  of   income", 5000)).toBe(1000);
    expect(evaluateBudgetExpression("2.5% of income", 2000)).toBe(50);
  });

  it("rounds to cents", () => {
    expect(evaluateBudgetExpression("10/3", 5000)).toBe(3.33);
  });

  it("returns null for empty or invalid input", () => {
    expect(evaluateBudgetExpression("", 5000)).toBeNull();
    expect(evaluateBudgetExpression("   ", 5000)).toBeNull();
    expect(evaluateBudgetExpression("abc", 5000)).toBeNull();
    expect(evaluateBudgetExpression("100 +", 5000)).toBeNull();
    expect(evaluateBudgetExpression("(100+50", 5000)).toBeNull();
    expect(evaluateBudgetExpression("100/0", 5000)).toBeNull();
  });

  it("never executes arbitrary code even if it looks dangerous", () => {
    expect(evaluateBudgetExpression("alert(1)", 5000)).toBeNull();
    expect(evaluateBudgetExpression("__proto__", 5000)).toBeNull();
  });
});

describe("looksLikeFormula", () => {
  it("flags arithmetic and percent-of-income as formulas", () => {
    expect(looksLikeFormula("1200/2")).toBe(true);
    expect(looksLikeFormula("50*4")).toBe(true);
    expect(looksLikeFormula("(1+2)")).toBe(true);
    expect(looksLikeFormula("15% of income")).toBe(true);
  });

  it("does not flag plain typed numbers", () => {
    expect(looksLikeFormula("1200")).toBe(false);
    expect(looksLikeFormula("-50")).toBe(false);
    expect(looksLikeFormula("$1,200.50")).toBe(false);
    expect(looksLikeFormula("")).toBe(false);
  });
});
