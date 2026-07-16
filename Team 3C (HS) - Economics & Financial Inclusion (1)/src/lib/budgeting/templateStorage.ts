// "Save as my default budget" — a named snapshot of one budget's line
// structure, reusable on any future period. localStorage, same plain
// getItem/setItem pattern used elsewhere in this app (AssistantWidget,
// useAuth, the Simulator's scenario storage) — this is a lightweight
// per-browser convenience, not data that needs to survive a device switch.

const STORAGE_KEY = "pp_budget_template";

export interface BudgetTemplateLine {
  category_id: string;
  category_name: string;
  group_name: string;
  amount_budgeted: number;
  rollover_enabled: boolean;
  sinking_fund_target_annual: number | null;
  sort_order: number;
}

export interface BudgetTemplate {
  savedAt: string;
  method: string;
  incomeExpected: number;
  lines: BudgetTemplateLine[];
}

export function saveTemplate(template: Omit<BudgetTemplate, "savedAt">): void {
  const full: BudgetTemplate = { ...template, savedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
}

export function loadTemplate(): BudgetTemplate | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BudgetTemplate) : null;
  } catch {
    return null;
  }
}

export function clearTemplate(): void {
  localStorage.removeItem(STORAGE_KEY);
}
