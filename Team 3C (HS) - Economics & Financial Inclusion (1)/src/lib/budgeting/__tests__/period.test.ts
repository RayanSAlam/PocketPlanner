import { describe, it, expect } from "vitest";
import { periodOf, shiftPeriod, daysInMonth, dayOfMonthWithin, daysRemainingInMonth, periodEnd, currentPeriod } from "@/lib/budgeting/period";

describe("periodOf / shiftPeriod", () => {
  it("normalizes any date to the first of its month", () => {
    expect(periodOf(new Date(2026, 6, 14))).toBe("2026-07-01");
    expect(periodOf(new Date(2026, 6, 31))).toBe("2026-07-01");
  });

  it("shifts across year boundaries", () => {
    expect(shiftPeriod("2026-01-01", -1)).toBe("2025-12-01");
    expect(shiftPeriod("2025-12-01", 1)).toBe("2026-01-01");
    expect(shiftPeriod("2026-07-01", 3)).toBe("2026-10-01");
  });
});

describe("daysInMonth", () => {
  it("handles standard months", () => {
    expect(daysInMonth("2026-07-01")).toBe(31);
    expect(daysInMonth("2026-04-01")).toBe(30);
  });

  it("handles February in leap and non-leap years", () => {
    expect(daysInMonth("2024-02-01")).toBe(29); // leap year
    expect(daysInMonth("2026-02-01")).toBe(28);
  });
});

describe("periodEnd", () => {
  it("returns the last calendar day of the period's month", () => {
    expect(periodEnd("2026-07-01")).toBe("2026-07-31");
    expect(periodEnd("2026-04-01")).toBe("2026-04-30");
    expect(periodEnd("2024-02-01")).toBe("2024-02-29");
  });
});

describe("dayOfMonthWithin / daysRemainingInMonth", () => {
  it("treats a non-current period as fully elapsed", () => {
    const pastPeriod = shiftPeriod(currentPeriod(), -2);
    expect(dayOfMonthWithin(pastPeriod)).toBe(daysInMonth(pastPeriod));
    expect(daysRemainingInMonth(pastPeriod)).toBe(1);
  });

  it("matches today's actual day-of-month for the current period", () => {
    const today = new Date();
    expect(dayOfMonthWithin(currentPeriod())).toBe(today.getDate());
  });

  it("days remaining + days elapsed - 1 equals total days in month", () => {
    const period = currentPeriod();
    expect(dayOfMonthWithin(period) + daysRemainingInMonth(period) - 1).toBe(daysInMonth(period));
  });
});
