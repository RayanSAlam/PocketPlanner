import { createContext, useContext, useState, type ReactNode } from "react";
import { QuickAddDialog } from "@/components/transactions/QuickAddDialog";

interface QuickAddContextValue {
  openQuickAdd: () => void;
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <QuickAddContext.Provider value={{ openQuickAdd: () => setOpen(true) }}>
      {children}
      <QuickAddDialog open={open} onOpenChange={setOpen} />
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAdd must be used within QuickAddProvider");
  return ctx;
}
