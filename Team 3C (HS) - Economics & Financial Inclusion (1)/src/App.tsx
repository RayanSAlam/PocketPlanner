import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import AppShell from "@/components/layout/AppShell";
import DashboardHome from "@/pages/dashboard/DashboardHome";
import ManualEntryPage from "@/pages/dashboard/ManualEntryPage";
import ChartsPage from "@/pages/dashboard/ChartsPage";
import UploadPage from "@/pages/dashboard/UploadPage";
import ReviewDocumentPage from "@/pages/dashboard/ReviewDocumentPage";
import ImportHistoryPage from "@/pages/dashboard/ImportHistoryPage";
import SimulationPage from "@/pages/dashboard/SimulationPage";
import BudgetingPage from "@/pages/dashboard/BudgetingPage";
import ImpactDashboardPage from "@/pages/dashboard/ImpactDashboardPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import StubPage from "@/pages/dashboard/StubPage";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./hooks/useAuth";
import { STUB_ROUTES } from "@/data/navigation";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardHome />} />
                <Route path="/manual-entry" element={<ManualEntryPage />} />
                <Route path="/charts" element={<ChartsPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/review/:documentId" element={<ReviewDocumentPage />} />
                <Route path="/import-history" element={<ImportHistoryPage />} />
                <Route path="/simulation" element={<SimulationPage />} />
                <Route path="/budgeting" element={<BudgetingPage />} />
                <Route path="/impact-dashboard" element={<ImpactDashboardPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                {STUB_ROUTES.filter((r) => !["/manual-entry", "/charts", "/upload", "/import-history", "/simulation", "/budgeting", "/impact-dashboard", "/settings"].includes(r.path)).map((r) => (
                  <Route key={r.path} path={r.path} element={<StubPage {...r} />} />
                ))}
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
