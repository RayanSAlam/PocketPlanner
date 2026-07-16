import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { Moon, LogOut, Settings, ChevronsUpDown } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavLink } from "@/components/NavLink";
import { PocketPlannerLogo } from "@/components/PocketPlannerLogo";
import { supabase } from "@/integrations/supabase/client";
import { markSessionOnly, useAuth } from "@/hooks/useAuth";
import { NAV_GROUPS } from "@/data/navigation";

const initials = (name: string) =>
  name
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "PP";

export function AppSidebar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fullName = (user?.user_metadata as { full_name?: string } | null)?.full_name ?? user?.email ?? "Guest";
  const email = user?.email ?? "";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    markSessionOnly(false);
    navigate("/auth", { replace: true });
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-3 pt-3">
        <PocketPlannerLogo size={26} showWordmark className="px-1 py-1.5" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="mt-2 flex w-full items-center gap-2.5 rounded-[var(--radius)] border border-border bg-card px-2.5 py-2 text-left transition-colors hover:bg-secondary/40">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-primary/15 text-primary font-display text-sm">
                  {initials(fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{fullName}</span>
                <span className="block truncate text-xs text-muted-foreground">{email}</span>
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onSelect={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] font-mono-data uppercase tracking-[0.1em] text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.path}
                        end={item.path === "/"}
                        className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                        activeClassName="!bg-primary/10 !text-primary font-medium border-l-2 border-primary -ml-0.5 pl-3"
                      >
                        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3">
        <div className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-border bg-card px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm text-foreground">
            <Moon className="h-4 w-4 text-muted-foreground" /> Dark Mode
          </span>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            aria-label="Toggle dark mode"
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
