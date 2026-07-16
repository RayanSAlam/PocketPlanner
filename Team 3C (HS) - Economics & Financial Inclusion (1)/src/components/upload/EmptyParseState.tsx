import { useNavigate } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyParseState({ filename }: { filename: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--radius)] border border-border bg-card px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <FileQuestion className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <div>
        <p className="font-display text-lg text-foreground">Hmm, we couldn't find any financial data</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          Nothing in <span className="text-foreground">{filename}</span> looked like a date and amount together. Try a bank statement, receipt, pay stub, or a screenshot of your transactions.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => navigate("/upload")}>
          Try another file
        </Button>
        <Button onClick={() => navigate("/manual-entry")} className="bg-gradient-to-r from-primary to-gold text-primary-foreground hover:opacity-90">
          Enter manually instead
        </Button>
      </div>
    </div>
  );
}
