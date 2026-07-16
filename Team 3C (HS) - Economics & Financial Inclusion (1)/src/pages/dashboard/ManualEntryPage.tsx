import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardShell } from "@/components/dashboard/CardShell";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { BulkEntryGrid } from "@/components/transactions/BulkEntryGrid";

export default function ManualEntryPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"single" | "bulk">("single");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-6 md:px-8 md:py-8">
      <div>
        <p className="font-mono-data mb-1 text-[11px] uppercase tracking-[0.12em] text-primary">Manual Entry</p>
        <h1 className="font-display text-2xl text-foreground md:text-3xl">Log a transaction by hand</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No statement to upload? Add it directly — one at a time, or paste several rows at once.
        </p>
      </div>

      <CardShell icon={PenLine} title="New transaction" subtitle="Single entry or bulk paste">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "single" | "bulk")}>
          <TabsList className="mb-4">
            <TabsTrigger value="single" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Single entry
            </TabsTrigger>
            <TabsTrigger value="bulk" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Bulk paste
            </TabsTrigger>
          </TabsList>
          <TabsContent value="single" className="mt-0">
            <TransactionForm onSuccess={() => navigate("/")} />
          </TabsContent>
          <TabsContent value="bulk" className="mt-0">
            <BulkEntryGrid onDone={() => navigate("/")} />
          </TabsContent>
        </Tabs>
      </CardShell>
    </div>
  );
}
