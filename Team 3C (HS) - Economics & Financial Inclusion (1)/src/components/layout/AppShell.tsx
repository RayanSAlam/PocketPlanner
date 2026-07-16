import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { useAuth } from "@/hooks/useAuth";
import { QuickAddProvider } from "@/hooks/useQuickAdd";
import { useImpactSettings } from "@/hooks/useImpactSettings";
import { useImpactSnapshot } from "@/hooks/useImpactSnapshot";

export default function AppShell() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  // Rendered here (not inside the pages that call trackEvent) so the
  // tracking-enabled cache is populated app-wide before any page fires an
  // event — trackEvent is a plain function outside React and can't read
  // this hook's state on its own (see useImpactSettings.ts).
  useImpactSettings();
  // Takes today's Financial Progress snapshot once per session — same
  // "app-wide session-start side effect" slot as useImpactSettings above.
  useImpactSnapshot();

  useEffect(() => {
    if (!loading && !session) navigate("/auth", { replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <QuickAddProvider>
      <SidebarProvider style={{ "--sidebar-width": "15rem" } as React.CSSProperties}>
        <AppSidebar />
        <SidebarInset>
          <AppTopbar />
          <div className="relative flex-1 overflow-y-auto">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
            >
              <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute right-0 top-40 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
              <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
            </div>
            <Outlet />
          </div>
          <AssistantWidget />
        </SidebarInset>
      </SidebarProvider>
    </QuickAddProvider>
  );
}
