import { Wallet, Receipt, PiggyBank, CreditCard, Settings2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { IncomeSection } from "@/components/simulation/IncomeSection";
import { ExpensesSection } from "@/components/simulation/ExpensesSection";
import { SavingsSection } from "@/components/simulation/SavingsSection";
import { DebtSection } from "@/components/simulation/DebtSection";
import { SettingsSection } from "@/components/simulation/SettingsSection";
import type { SimulationInput } from "@/lib/simulation/types";
import type { InputAction } from "@/hooks/useSimulationReducer";

const SECTIONS = [
  { value: "income", label: "Income", icon: Wallet },
  { value: "expenses", label: "Expenses", icon: Receipt },
  { value: "savings", label: "Savings & Investments", icon: PiggyBank },
  { value: "debt", label: "Debt", icon: CreditCard },
  { value: "settings", label: "Simulation Settings", icon: Settings2 },
] as const;

interface ControlPanelProps {
  input: SimulationInput;
  dispatch: React.Dispatch<InputAction>;
}

export function ControlPanel({ input, dispatch }: ControlPanelProps) {
  return (
    <Accordion type="multiple" defaultValue={["income", "expenses"]} className="w-full">
      {SECTIONS.map(({ value, label, icon: Icon }) => (
        <AccordionItem key={value} value={value}>
          <AccordionTrigger className="text-sm font-medium">
            <span className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
              {label}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-0.5 pt-1">
            {value === "income" && <IncomeSection input={input} dispatch={dispatch} />}
            {value === "expenses" && <ExpensesSection input={input} dispatch={dispatch} />}
            {value === "savings" && <SavingsSection input={input} dispatch={dispatch} />}
            {value === "debt" && <DebtSection input={input} dispatch={dispatch} />}
            {value === "settings" && <SettingsSection input={input} dispatch={dispatch} />}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
