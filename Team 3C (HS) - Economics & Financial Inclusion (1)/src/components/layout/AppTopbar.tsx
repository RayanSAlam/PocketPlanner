import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Landmark, LineChart, PiggyBank, Award, UserCircle, Search, X } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { cn } from "@/lib/utils";
import { getRouteLabel } from "@/data/navigation";
import { useQuickAdd } from "@/hooks/useQuickAdd";

interface ShortcutDef {
  label: string;
  icon: typeof Plus;
  onClick?: () => void;
}

export function AppTopbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openQuickAdd } = useQuickAdd();
  const [searchOpen, setSearchOpen] = useState(false);
  const routeLabel = getRouteLabel(location.pathname);

  const SHORTCUTS_BEFORE_BELL: ShortcutDef[] = [
    { label: "Add a transaction", icon: Plus, onClick: openQuickAdd },
    { label: "Accounts", icon: Landmark, onClick: () => navigate("/accounts") },
    { label: "Charts", icon: LineChart, onClick: () => navigate("/charts") },
  ];
  const SHORTCUTS_AFTER_BELL: ShortcutDef[] = [
    { label: "Budgets", icon: PiggyBank, onClick: () => navigate("/budgeting") },
    { label: "Achievements — coming soon", icon: Award },
    { label: "Profile & settings", icon: UserCircle, onClick: () => navigate("/settings") },
  ];

  return (
    <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 md:px-6">
      <SidebarTrigger className="text-foreground" />

      <span className="font-mono-data rounded-full bg-gradient-to-r from-primary to-gold px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary-foreground shadow-sm">
        {routeLabel}
      </span>

      <div className="ml-1 hidden items-center gap-1.5 sm:flex">
        {SHORTCUTS_BEFORE_BELL.map((s) => (
          <Tooltip key={s.label}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={s.onClick}
                aria-label={s.label}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary",
                  !s.onClick && "cursor-default opacity-60 hover:border-border hover:text-muted-foreground",
                )}
              >
                <s.icon className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{s.label}</TooltipContent>
          </Tooltip>
        ))}
        <NotificationBell />
        {SHORTCUTS_AFTER_BELL.map((s) => (
          <Tooltip key={s.label}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={s.onClick}
                aria-label={s.label}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary",
                  !s.onClick && "cursor-default opacity-60 hover:border-border hover:text-muted-foreground",
                )}
              >
                <s.icon className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{s.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="ml-auto flex items-center">
        {searchOpen ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              placeholder="Search... (coming soon)"
              className="h-9 w-40 sm:w-56"
              onBlur={() => setSearchOpen(false)}
            />
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setSearchOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Search className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>
    </header>
  );
}
