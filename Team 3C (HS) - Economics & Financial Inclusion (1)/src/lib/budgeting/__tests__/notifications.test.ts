import { describe, it, expect } from "vitest";
import { computeBudgetNotifications, type NotificationInputRow } from "@/lib/budgeting/notifications";

const allEnabled = { threshold80Enabled: true, threshold100Enabled: true, weeklySummaryEnabled: true };
const noneEnabled = { threshold80Enabled: false, threshold100Enabled: false, weeklySummaryEnabled: false };

function row(overrides: Partial<NotificationInputRow>): NotificationInputRow {
  return { lineId: "l1", categoryName: "Dining", amountBudgeted: 300, spent: 100, pctUsed: 33, ...overrides };
}

describe("computeBudgetNotifications", () => {
  it("flags a category at or over 100% as an alert", () => {
    const result = computeBudgetNotifications([row({ pctUsed: 105 })], allEnabled, 15);
    expect(result.some((n) => n.level === "alert" && n.message.includes("over budget"))).toBe(true);
  });

  it("flags a category between 80% and 100% as a warning, not an alert", () => {
    const result = computeBudgetNotifications([row({ pctUsed: 85 })], allEnabled, 15);
    const notif = result.find((n) => n.id === "l1-80");
    expect(notif?.level).toBe("warning");
    expect(result.some((n) => n.id === "l1-100")).toBe(false);
  });

  it("does not double-notify the same category at both thresholds", () => {
    const result = computeBudgetNotifications([row({ pctUsed: 105 })], allEnabled, 15);
    expect(result.filter((n) => n.id.startsWith("l1-"))).toHaveLength(1);
  });

  it("respects disabled toggles", () => {
    const result = computeBudgetNotifications([row({ pctUsed: 105 })], noneEnabled, 15);
    expect(result).toHaveLength(0);
  });

  it("skips a zero-budget line entirely", () => {
    const result = computeBudgetNotifications([row({ amountBudgeted: 0, pctUsed: 999 })], allEnabled, 15);
    expect(result).toHaveLength(0);
  });

  it("includes a weekly summary only inside the last 7 days of the month", () => {
    const withinWeek = computeBudgetNotifications([row({ pctUsed: 50 })], allEnabled, 5);
    expect(withinWeek.some((n) => n.id === "weekly-summary")).toBe(true);

    const notYet = computeBudgetNotifications([row({ pctUsed: 50 })], allEnabled, 20);
    expect(notYet.some((n) => n.id === "weekly-summary")).toBe(false);
  });

  it("weekly summary mentions over-budget count when relevant", () => {
    const result = computeBudgetNotifications(
      [row({ lineId: "l1", pctUsed: 105 }), row({ lineId: "l2", pctUsed: 40 })],
      allEnabled,
      3,
    );
    const summary = result.find((n) => n.id === "weekly-summary");
    expect(summary?.message).toContain("1 category is over budget");
  });

  it("sorts alerts before warnings before info", () => {
    const result = computeBudgetNotifications(
      [row({ lineId: "l1", pctUsed: 50 }), row({ lineId: "l2", pctUsed: 85 }), row({ lineId: "l3", pctUsed: 120 })],
      allEnabled,
      3,
    );
    const levels = result.map((n) => n.level);
    expect(levels.indexOf("alert")).toBeLessThan(levels.indexOf("warning"));
    expect(levels.indexOf("warning")).toBeLessThan(levels.indexOf("info"));
  });
});
