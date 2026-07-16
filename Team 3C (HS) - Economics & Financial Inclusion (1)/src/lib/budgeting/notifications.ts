export type NotificationLevel = "warning" | "alert" | "info";

export interface BudgetNotification {
  id: string;
  level: NotificationLevel;
  message: string;
}

export interface NotificationInputRow {
  lineId: string;
  categoryName: string;
  amountBudgeted: number;
  spent: number;
  pctUsed: number;
}

export interface NotificationTogglesInput {
  threshold80Enabled: boolean;
  threshold100Enabled: boolean;
  weeklySummaryEnabled: boolean;
}

// One notification per category (100% takes priority over 80% for the
// same category — no point telling someone twice about the same line).
export function computeBudgetNotifications(rows: NotificationInputRow[], toggles: NotificationTogglesInput, daysRemaining: number): BudgetNotification[] {
  const notifications: BudgetNotification[] = [];

  for (const row of rows) {
    if (row.amountBudgeted <= 0) continue;
    if (toggles.threshold100Enabled && row.pctUsed >= 100) {
      notifications.push({ id: `${row.lineId}-100`, level: "alert", message: `${row.categoryName} is over budget (${Math.round(row.pctUsed)}% used).` });
    } else if (toggles.threshold80Enabled && row.pctUsed >= 80) {
      notifications.push({ id: `${row.lineId}-80`, level: "warning", message: `${row.categoryName} is at ${Math.round(row.pctUsed)}% of its budget.` });
    }
  }

  if (toggles.weeklySummaryEnabled && daysRemaining <= 7) {
    const overBudgetCount = rows.filter((r) => r.amountBudgeted > 0 && r.pctUsed >= 100).length;
    notifications.push({
      id: "weekly-summary",
      level: "info",
      message:
        overBudgetCount > 0
          ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left this month, ${overBudgetCount} categor${overBudgetCount === 1 ? "y is" : "ies are"} over budget.`
          : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left this month — everything's on track.`,
    });
  }

  const priority: Record<NotificationLevel, number> = { alert: 0, warning: 1, info: 2 };
  return notifications.sort((a, b) => priority[a.level] - priority[b.level]);
}
