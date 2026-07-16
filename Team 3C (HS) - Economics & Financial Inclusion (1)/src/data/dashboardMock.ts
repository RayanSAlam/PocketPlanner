import { Wallet, Layers, CheckCircle2, Clock, type LucideIcon } from "lucide-react";

export interface StatCardData {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface Transaction {
  id: string;
  merchant: string;
  category: string;
  date: string;
  amount: number;
  kind: "transaction" | "transfer";
}

export interface Insight {
  id: string;
  text: string;
}

export interface ActivityItem {
  id: string;
  text: string;
  timestamp: string;
}

export const STAT_CARDS: StatCardData[] = [
  { id: "net-worth", label: "Net Worth", value: "$12,450", icon: Wallet },
  { id: "monthly-spending", label: "Monthly Spending", value: "$1,238", icon: Layers },
  { id: "budgets-on-track", label: "Budgets On Track", value: "4", icon: CheckCircle2 },
  { id: "upcoming-bills", label: "Upcoming Bills", value: "3", icon: Clock },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "t1", merchant: "Whole Foods Market", category: "Groceries", date: "Jul 12", amount: -86.42, kind: "transaction" },
  { id: "t2", merchant: "Paycheck — Acme Inc.", category: "Income", date: "Jul 10", amount: 1920.0, kind: "transaction" },
  { id: "t3", merchant: "Spotify", category: "Subscriptions", date: "Jul 9", amount: -11.99, kind: "transaction" },
  { id: "t4", merchant: "Savings sweep", category: "Transfer", date: "Jul 8", amount: -300.0, kind: "transfer" },
  { id: "t5", merchant: "Shell", category: "Transportation", date: "Jul 7", amount: -42.1, kind: "transaction" },
  { id: "t6", merchant: "Chipotle", category: "Dining", date: "Jul 6", amount: -14.75, kind: "transaction" },
];

export const MOCK_INSIGHTS: Insight[] = [
  { id: "i1", text: "Dining spend is up 24% vs. last month — mostly delivery apps." },
  { id: "i2", text: "You're on pace to beat your savings goal by $60 this month." },
  { id: "i3", text: "Two subscriptions haven't been used in 30+ days." },
];

export const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "a1", text: "Linked a new account: Chase Checking", timestamp: "2 days ago" },
  { id: "a2", text: "Budget updated for Groceries", timestamp: "4 days ago" },
  { id: "a3", text: "Simulation saved: \"5-year retirement path\"", timestamp: "1 week ago" },
];
