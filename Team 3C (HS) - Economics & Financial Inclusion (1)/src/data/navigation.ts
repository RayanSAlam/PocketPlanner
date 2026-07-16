import {
  LayoutDashboard,
  Upload,
  PenLine,
  Landmark,
  FlaskConical,
  LineChart,
  PiggyBank,
  Settings,
  GraduationCap,
  HelpCircle,
  BookOpen,
  History,
  Activity,
  type LucideIcon,
} from "lucide-react";

export interface StubRouteMeta {
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const DASHBOARD_LABEL = "Dashboard";
const DASHBOARD_ICON = LayoutDashboard;

export const STUB_ROUTES: StubRouteMeta[] = [
  {
    path: "/upload",
    label: "Upload Documents",
    description: "Drop a CSV or PDF statement and we'll sort it into categories automatically.",
    icon: Upload,
  },
  {
    path: "/manual-entry",
    label: "Manual Entry",
    description: "Log a transaction by hand when there's no statement to upload.",
    icon: PenLine,
  },
  {
    path: "/accounts",
    label: "Accounts",
    description: "Connect and manage every account in one place.",
    icon: Landmark,
  },
  {
    path: "/import-history",
    label: "Import History",
    description: "Every document you've uploaded, with a one-click undo for any confirmed import.",
    icon: History,
  },
  {
    path: "/simulation",
    label: "Simulation",
    description: "Model what-if scenarios and see how they play out over time.",
    icon: FlaskConical,
  },
  {
    path: "/charts",
    label: "Charts",
    description: "Visualize your spending and saving trends at a glance.",
    icon: LineChart,
  },
  {
    path: "/budgeting",
    label: "Budgeting",
    description: "Set spending limits per category and track how you're doing.",
    icon: PiggyBank,
  },
  {
    path: "/settings",
    label: "Account & Settings",
    description: "Manage your profile, preferences, and security.",
    icon: Settings,
  },
  {
    path: "/tutorial",
    label: "Tutorial",
    description: "A quick walkthrough of everything PocketPlanner can do.",
    icon: GraduationCap,
  },
  {
    path: "/help",
    label: "Help",
    description: "Answers to common questions and ways to reach us.",
    icon: HelpCircle,
  },
  {
    path: "/docs",
    label: "Docs",
    description: "Reference docs for how PocketPlanner works under the hood.",
    icon: BookOpen,
  },
  {
    path: "/impact-dashboard",
    label: "Impact Dashboard",
    description: "Internal, de-identified view of PocketPlanner's product-impact metrics.",
    icon: Activity,
  },
];

const byPath = (path: string) => STUB_ROUTES.find((r) => r.path === path)!;

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: DASHBOARD_LABEL, path: "/", icon: DASHBOARD_ICON },
      { label: byPath("/upload").label, path: "/upload", icon: byPath("/upload").icon },
      { label: byPath("/manual-entry").label, path: "/manual-entry", icon: byPath("/manual-entry").icon },
      { label: byPath("/accounts").label, path: "/accounts", icon: byPath("/accounts").icon },
      { label: byPath("/import-history").label, path: "/import-history", icon: byPath("/import-history").icon },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: byPath("/simulation").label, path: "/simulation", icon: byPath("/simulation").icon },
      { label: byPath("/charts").label, path: "/charts", icon: byPath("/charts").icon },
      { label: byPath("/budgeting").label, path: "/budgeting", icon: byPath("/budgeting").icon },
    ],
  },
  {
    label: "More",
    items: [
      { label: byPath("/settings").label, path: "/settings", icon: byPath("/settings").icon },
      { label: byPath("/tutorial").label, path: "/tutorial", icon: byPath("/tutorial").icon },
      { label: byPath("/help").label, path: "/help", icon: byPath("/help").icon },
      { label: byPath("/docs").label, path: "/docs", icon: byPath("/docs").icon },
      { label: byPath("/impact-dashboard").label, path: "/impact-dashboard", icon: byPath("/impact-dashboard").icon },
    ],
  },
];

export function getRouteLabel(pathname: string): string {
  if (pathname === "/") return DASHBOARD_LABEL;
  if (pathname.startsWith("/review/")) return "Review & Confirm";
  return STUB_ROUTES.find((r) => r.path === pathname)?.label ?? DASHBOARD_LABEL;
}
