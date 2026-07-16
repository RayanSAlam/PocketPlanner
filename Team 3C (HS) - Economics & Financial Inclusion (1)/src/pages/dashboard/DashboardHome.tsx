import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Pencil,
  Rocket,
  Plus,
  Upload,
  FlaskConical,
  PiggyBank,
  RefreshCw,
  Receipt,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { useTransactions } from "@/hooks/useTransactions";
import { cn } from "@/lib/utils";
import { money, formatDate } from "@/lib/format";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { ImpactProgressCard } from "@/components/dashboard/ImpactProgressCard";
import { STAT_CARDS, MOCK_INSIGHTS, MOCK_ACTIVITY, type Insight, type ActivityItem } from "@/data/dashboardMock";

export default function DashboardHome() {
  const { user } = useAuth();
  const [hasData, setHasData] = useState(true);

  const fullName = (user?.user_metadata as { full_name?: string } | null)?.full_name ?? user?.email ?? "";
  const firstName = fullName.split(/[\s@]/)[0];

  const insights = hasData ? MOCK_INSIGHTS : [];
  const activity = hasData ? MOCK_ACTIVITY : [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 md:space-y-8 md:px-8 md:py-8">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Insights and activity below are still demo data — everything else on this page is live.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHasData((v) => !v)}
          className="font-mono-data text-xs text-muted-foreground"
        >
          {hasData ? "Preview empty" : "Preview data"}
        </Button>
      </div>

      <HeroBanner firstName={firstName} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <StatCard key={s.id} {...s} />
        ))}
      </div>

      <ImpactProgressCard />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TransactionsCard />
          <InsightsCard insights={insights} />
        </div>
        <div className="space-y-6">
          <QuickActionsCard />
          <ActivityCard activity={activity} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Hero ------------------------------ */

const HeroBanner = ({ firstName }: { firstName: string }) => (
  <div className="relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-primary to-gold px-6 py-8 text-primary-foreground shadow-sm md:px-10 md:py-10">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20">
      <span className="absolute left-[8%] top-[20%] text-2xl">✦</span>
      <span className="absolute left-[22%] top-[65%] text-lg">✧</span>
      <span className="absolute left-[38%] top-[15%] h-2 w-2 rounded-full bg-current" />
      <span className="absolute left-[52%] top-[75%] text-xl">✦</span>
      <span className="absolute left-[65%] top-[30%] h-1.5 w-1.5 rounded-full bg-current" />
      <span className="absolute left-[80%] top-[60%] text-lg">✧</span>
      <svg className="absolute right-[8%] top-[15%] h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 12c4-6 12-6 16 0" strokeLinecap="round" />
      </svg>
    </div>

    <button
      type="button"
      onClick={() => toast("Customization coming soon")}
      aria-label="Customize dashboard"
      className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/15 text-primary-foreground transition-colors hover:bg-primary-foreground/25"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>

    <div className="relative flex items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20 font-display text-lg">
          {firstName ? firstName[0]?.toUpperCase() : "P"}
        </div>
        <div>
          <h1 className="font-display text-2xl leading-tight md:text-3xl">
            Hello{firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/85 md:text-base">
            Welcome back to your PocketPlanner dashboard.
          </p>
        </div>
      </div>

      <div
        className="hidden select-none text-right font-display text-3xl italic leading-[0.95] md:block md:text-4xl"
        style={{ WebkitTextStroke: "1.5px hsl(var(--primary-foreground))", color: "transparent" }}
      >
        <div>POCKET</div>
        <div>PLANNER</div>
      </div>
    </div>
  </div>
);

/* ------------------------------ Stat cards ------------------------------ */

const StatCard = ({ label, value, icon: Icon }: (typeof STAT_CARDS)[number]) => (
  <div className="flex items-center gap-4 rounded-[1.25rem] border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-primary-foreground">
      <Icon className="h-5 w-5" strokeWidth={1.75} />
    </div>
    <div className="min-w-0">
      <p className="font-display font-mono-data truncate text-2xl tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 truncate text-[11px] font-mono-data uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
    </div>
  </div>
);

/* ------------------------------ Transactions (real data) ------------------------------ */

const TransactionsCard = () => {
  const navigate = useNavigate();
  const { data: transactions, isLoading } = useTransactions(8);

  return (
    <CardShell icon={Receipt} title="Recent Transactions" subtitle="Latest activity across your accounts">
      {isLoading ? (
        <EmptyRow>Loading…</EmptyRow>
      ) : !transactions || transactions.length === 0 ? (
        <EmptyRow>No transactions yet</EmptyRow>
      ) : (
        <ul className="divide-y divide-border">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{t.description}</p>
                <div className="mt-1 flex items-center gap-2">
                  {t.category && (
                    <Badge variant="secondary" className="text-[10px]">
                      {t.category.name}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{formatDate(t.tx_date)}</span>
                </div>
              </div>
              <span
                className={cn(
                  "font-mono-data shrink-0 text-sm tabular-nums",
                  t.amount < 0 ? "text-destructive" : "text-primary",
                )}
              >
                {money(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => navigate("/accounts")}
        className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:gap-1.5 transition-all"
      >
        View all transactions <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </CardShell>
  );
};

/* ------------------------------ Insights ------------------------------ */

const InsightsCard = ({ insights }: { insights: Insight[] }) => (
  <CardShell
    icon={Sparkles}
    title="Smart Insights"
    subtitle="AI-detected patterns in your spending"
    action={
      <button
        type="button"
        onClick={() => toast("Insights refreshed")}
        aria-label="Refresh insights"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    }
  >
    {insights.length === 0 ? (
      <EmptyRow>
        No insights yet.
        <br />
        More data = better insights!
      </EmptyRow>
    ) : (
      <ul className="space-y-2.5">
        {insights.map((i) => (
          <li key={i.id} className="flex items-start gap-2.5 rounded-lg bg-secondary/50 p-3 text-sm text-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
            {i.text}
          </li>
        ))}
      </ul>
    )}
  </CardShell>
);

/* ------------------------------ Quick actions ------------------------------ */

const QuickActionsCard = () => {
  const navigate = useNavigate();
  const { openQuickAdd } = useQuickAdd();
  return (
    <CardShell icon={Rocket} title="Quick Actions" subtitle="Jump to common tasks">
      <div className="space-y-2.5">
        <Button
          className="w-full justify-start gap-2 bg-gradient-to-r from-primary to-gold text-primary-foreground hover:opacity-90"
          onClick={openQuickAdd}
        >
          <Plus className="h-4 w-4" /> Add a transaction
        </Button>
        <Button variant="secondary" className="w-full justify-start gap-2" onClick={() => navigate("/upload")}>
          <Upload className="h-4 w-4" /> Upload financial documents
        </Button>
        <Button variant="secondary" className="w-full justify-start gap-2" onClick={() => navigate("/simulation")}>
          <FlaskConical className="h-4 w-4" /> Open Simulation
        </Button>
        <Button variant="secondary" className="w-full justify-start gap-2" onClick={() => navigate("/budgeting")}>
          <PiggyBank className="h-4 w-4" /> View Budgets & Charts
        </Button>
      </div>
    </CardShell>
  );
};

/* ------------------------------ Activity ------------------------------ */

const ActivityCard = ({ activity }: { activity: ActivityItem[] }) => (
  <CardShell icon={Sparkles} title="Recent Activity" subtitle="Latest updates on your accounts">
    {activity.length === 0 ? (
      <EmptyRow>No activity yet — add your first transaction!</EmptyRow>
    ) : (
      <ul className="space-y-3">
        {activity.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-foreground">{a.text}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{a.timestamp}</span>
          </li>
        ))}
      </ul>
    )}
  </CardShell>
);
