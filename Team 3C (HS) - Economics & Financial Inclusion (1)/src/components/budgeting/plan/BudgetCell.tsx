import { useEffect, useRef, useState } from "react";
import { Sigma } from "lucide-react";
import { evaluateBudgetExpression, looksLikeFormula } from "@/lib/budgeting/expression";
import { moneyAbs } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BudgetCellProps {
  id: string;
  value: number;
  income: number;
  onCommit: (newValue: number) => void;
  onNavigate: (direction: "up" | "down") => void;
  onPasteRows?: (values: number[]) => void;
}

// Click-to-edit numeric cell with formula-lite support (plain numbers,
// +-*/ with parens, "N% of income") — evaluates on blur/Enter, not on
// every keystroke, so typing "50*4" doesn't error out mid-way through.
const ABSURD_MULTIPLE = 10;

export function BudgetCell({ id, value, income, onCommit, onNavigate, onPasteRows }: BudgetCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  const [confirmValue, setConfirmValue] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const finalizeCommit = (result: number) => {
    setEditing(false);
    if (result !== value) onCommit(result);
  };

  const commit = (): boolean => {
    // The AlertDialog steals focus, which would otherwise re-fire onBlur
    // and re-open a second confirm on top of itself.
    if (confirmValue !== null) return false;
    const result = evaluateBudgetExpression(draft, income);
    if (result === null || result < 0) {
      setInvalid(true);
      setTimeout(() => setInvalid(false), 400);
      return false;
    }
    // A single category budgeted at more than 10x monthly income is almost
    // always a typo (an extra zero, a misplaced decimal) — a soft confirm
    // catches that without blocking genuinely unusual-but-intentional entries.
    if (income > 0 && result > income * ABSURD_MULTIPLE) {
      setConfirmValue(result);
      return false;
    }
    finalizeCommit(result);
    return true;
  };

  const cancel = () => {
    setDraft(String(value));
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        id={id}
        onClick={startEdit}
        onFocus={startEdit}
        className="font-mono-data w-full rounded px-2 py-1.5 text-right text-sm text-foreground transition-colors hover:bg-secondary focus:bg-secondary focus:outline-none"
      >
        {moneyAbs(value)}
      </button>
    );
  }

  return (
    <div className="relative">
      {looksLikeFormula(draft) && (
        <Sigma className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-primary" aria-hidden="true" />
      )}
      <input
        ref={inputRef}
        id={id}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          // Multi-row paste from a real spreadsheet (tab/newline-delimited)
          // — take the first column of each line and distribute down
          // subsequent rows starting here. A plain single-value paste falls
          // through to normal input behavior.
          if (!onPasteRows || (!text.includes("\n") && !text.includes("\t"))) return;
          e.preventDefault();
          const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);
          const values = lines
            .map((line) => evaluateBudgetExpression(line.split("\t")[0], income))
            .filter((v): v is number => v !== null && v >= 0);
          if (values.length > 0) {
            setEditing(false);
            onPasteRows(values);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (commit()) onNavigate("down");
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (commit()) onNavigate("down");
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (commit()) onNavigate("up");
          }
        }}
        aria-label="Budgeted amount"
        inputMode="decimal"
        className={cn(
          "font-mono-data w-full rounded border bg-background px-2 py-1.5 text-right text-sm text-foreground outline-none",
          invalid ? "animate-shake border-destructive" : "border-primary",
          looksLikeFormula(draft) && "pl-6",
        )}
      />

      <AlertDialog open={confirmValue !== null} onOpenChange={(open) => !open && setConfirmValue(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>That's a big number</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmValue !== null && moneyAbs(confirmValue)} is more than {ABSURD_MULTIPLE}x your monthly income — just checking this wasn't a typo before saving it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmValue(null)}>Let me fix it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmValue !== null) finalizeCommit(confirmValue);
                setConfirmValue(null);
              }}
            >
              Yes, that's right
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
