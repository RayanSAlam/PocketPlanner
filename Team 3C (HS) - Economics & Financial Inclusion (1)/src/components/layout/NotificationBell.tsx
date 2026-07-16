import { Bell, AlertCircle, AlertTriangle, Info, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useBudgetPeriod } from "@/hooks/useBudgetPeriod";
import { useBudgetProgress } from "@/hooks/useBudgetProgress";
import { useNotificationSettings, useUpdateNotificationSettings } from "@/hooks/useNotificationSettings";
import { computeBudgetNotifications } from "@/lib/budgeting/notifications";
import { currentPeriod, daysRemainingInMonth } from "@/lib/budgeting/period";
import { cn } from "@/lib/utils";

const LEVEL_ICON = { alert: AlertCircle, warning: AlertTriangle, info: Info } as const;
const LEVEL_COLOR = { alert: "text-destructive", warning: "text-gold-foreground", info: "text-muted-foreground" } as const;

export function NotificationBell() {
  const navigate = useNavigate();
  const period = currentPeriod();
  const { data: budget } = useBudgetPeriod(period);
  const { data: rows = [] } = useBudgetProgress(period);
  const { data: settings } = useNotificationSettings();

  const notifications = budget && settings
    ? computeBudgetNotifications(
        rows.map((r) => ({ lineId: r.line_id, categoryName: r.category_name, amountBudgeted: r.amount_budgeted, spent: r.spent, pctUsed: r.pct_used })),
        { threshold80Enabled: settings.threshold_80_enabled, threshold100Enabled: settings.threshold_100_enabled, weeklySummaryEnabled: settings.weekly_summary_enabled },
        daysRemainingInMonth(period),
      )
    : [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={notifications.length > 0 ? `Notifications (${notifications.length})` : "Notifications"}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {notifications.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <SettingsPopover settingsId={settings?.id} />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!budget ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Set up a budget to see alerts here.</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">All quiet — nothing needs your attention.</p>
          ) : (
            <ul>
              {notifications.map((n) => {
                const Icon = LEVEL_ICON[n.level];
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => navigate("/budgeting")}
                      className="flex w-full items-start gap-2.5 border-b border-border/60 px-4 py-2.5 text-left text-sm hover:bg-secondary/50"
                    >
                      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", LEVEL_COLOR[n.level])} />
                      <span className="text-foreground">{n.message}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SettingsPopover({ settingsId }: { settingsId: string | undefined }) {
  const { data: settings } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();

  if (!settings || !settingsId) return null;

  const toggle = (field: "threshold_80_enabled" | "threshold_100_enabled" | "weekly_summary_enabled") => {
    updateSettings.mutate({ id: settingsId, [field]: !settings[field] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Notification settings" className="text-muted-foreground hover:text-foreground">
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <p className="text-xs font-medium text-foreground">Alert me when...</p>
        <SettingRow label="A category hits 80%" checked={settings.threshold_80_enabled} onChange={() => toggle("threshold_80_enabled")} />
        <SettingRow label="A category goes over budget" checked={settings.threshold_100_enabled} onChange={() => toggle("threshold_100_enabled")} />
        <SettingRow label="Weekly summary (last 7 days)" checked={settings.weekly_summary_enabled} onChange={() => toggle("weekly_summary_enabled")} />
      </PopoverContent>
    </Popover>
  );
}

function SettingRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-75" />
    </div>
  );
}
