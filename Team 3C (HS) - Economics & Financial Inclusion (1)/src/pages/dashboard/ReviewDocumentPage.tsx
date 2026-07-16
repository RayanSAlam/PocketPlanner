import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ClipboardCheck, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardShell } from "@/components/dashboard/CardShell";
import { TransactionReviewTable, type ReviewRow } from "@/components/transactions/TransactionReviewTable";
import { EmptyParseState } from "@/components/upload/EmptyParseState";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useDocument, useUpdateDocument, archiveDocumentFile } from "@/hooks/useDocuments";
import { supabase } from "@/integrations/supabase/client";
import { normalizeMerchant, suggestCategoryForMerchant, upsertMerchantRule } from "@/lib/merchant";
import { moneyAbs, todayIso } from "@/lib/format";
import type { ParseResult } from "@/lib/parsing/types";

let rowSeq = 0;

export default function ReviewDocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { data: accounts } = useAccounts();
  const { data: doc } = useDocument(documentId);
  const updateDocument = useUpdateDocument();

  const state = location.state as { result?: ParseResult; file?: File } | null;
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const defaultAccountId = accounts?.find((a) => a.is_default)?.id ?? accounts?.[0]?.id ?? "";

  useEffect(() => {
    if (!state?.result || !defaultAccountId) return;
    let cancelled = false;

    const build = async () => {
      const initial: ReviewRow[] = state.result!.transactions.map((t) => ({
        id: `rr${++rowSeq}`,
        date: t.date ?? todayIso(),
        amount: t.amount,
        description: t.description,
        category_id: null,
        account_id: defaultAccountId,
        confidence: t.confidence,
        included: true,
        isDuplicate: false,
      }));

      // Merchant-rule category suggestions (real lookups, not a guess).
      await Promise.all(
        initial.map(async (r, i) => {
          const suggestion = await suggestCategoryForMerchant(r.description);
          if (suggestion) initial[i] = { ...initial[i], category_id: suggestion };
        }),
      );

      // Duplicate detection against existing transactions.
      const candidateRows = initial.map((r) => ({ tx_date: r.date, amount: r.amount, description: r.description }));
      const { data: dupes } = await supabase.rpc("check_duplicate_candidates", { p_rows: candidateRows });
      if (dupes) {
        for (const d of dupes) {
          if (initial[d.candidate_index]) initial[d.candidate_index] = { ...initial[d.candidate_index], isDuplicate: true };
        }
      }

      if (!cancelled) setRows(initial);
    };

    void build();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.result, defaultAccountId]);

  if (!state?.result) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center md:px-10">
        <p className="font-display text-xl text-foreground">This review session isn't available anymore</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Extracted data only lives for the current upload session. {doc ? `"${doc.filename}"` : "This document"} can be re-uploaded from scratch.
        </p>
        <Button className="mt-5" onClick={() => navigate("/upload")}>
          Back to Upload
        </Button>
      </div>
    );
  }

  const result = state.result;
  const included = (rows ?? []).filter((r) => r.included);
  const sumIncluded = included.reduce((s, r) => s + (r.amount ?? 0), 0);
  const showCompletenessBanner = result.detectedTotal != null && Math.abs(Math.abs(sumIncluded) - Math.abs(result.detectedTotal)) > 0.01;

  const handleReject = async () => {
    if (!documentId) return;
    await updateDocument.mutateAsync({ id: documentId, patch: { status: "rejected" } });
    toast("Document rejected — nothing was saved");
    navigate("/upload");
  };

  const handleConfirm = async () => {
    if (!documentId || !session || !rows) return;
    const rowsToSave = rows.filter((r) => r.included && r.date && r.amount !== null && r.account_id);
    if (rowsToSave.length === 0) {
      toast.error("Nothing to save — every row is missing a date, amount, or was excluded");
      return;
    }

    setSaving(true);
    try {
      const payload = rowsToSave.map((r) => ({
        account_id: r.account_id,
        category_id: r.category_id,
        amount: r.amount,
        description: r.description,
        merchant_raw: r.description,
        merchant_normalized: normalizeMerchant(r.description),
        tx_date: r.date,
        confidence: r.confidence === "high" ? 0.9 : r.confidence === "medium" ? 0.6 : 0.3,
        is_recurring: false,
      }));

      const { error: rpcError } = await supabase.rpc("confirm_document_import", {
        p_document_id: documentId,
        p_rows: payload,
      });
      if (rpcError) throw rpcError;

      await Promise.all(
        rowsToSave.filter((r) => r.category_id).map((r) => upsertMerchantRule(r.description, r.category_id as string)),
      );

      if (state.file) {
        try {
          const path = await archiveDocumentFile(session.user.id, documentId, state.file);
          await updateDocument.mutateAsync({ id: documentId, patch: { storage_path: path } });
        } catch {
          // Non-fatal — the transactions are already saved; archiving the
          // source file is a nice-to-have, not a requirement for success.
          toast("Saved, but couldn't archive the original file");
        }
      }

      toast.success(`Saved ${rowsToSave.length} transaction${rowsToSave.length === 1 ? "" : "s"}`, {
        action: { label: "View in Charts", onClick: () => navigate("/charts") },
      });
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save these transactions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-6 md:px-8 md:py-8">
      <div>
        <p className="font-mono-data mb-1 text-[11px] uppercase tracking-[0.12em] text-primary">Review & Confirm</p>
        <h1 className="font-display text-2xl text-foreground md:text-3xl">{doc?.filename ?? "Review extracted transactions"}</h1>
        {result.warnings.length > 0 && (
          <ul className="mt-2 space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>

      {result.transactions.length === 0 ? (
        <EmptyParseState filename={doc?.filename ?? "this file"} />
      ) : !rows ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking for duplicates and category matches…
        </div>
      ) : (
        <>
          {showCompletenessBanner && (
            <div className="rounded-[var(--radius)] border border-gold/40 bg-gold-tint px-4 py-3 text-sm text-foreground">
              This looks incomplete — the rows here add up to {moneyAbs(sumIncluded)}, but the document states a total of{" "}
              {moneyAbs(result.detectedTotal as number)} (a difference of {moneyAbs(Math.abs(sumIncluded - (result.detectedTotal as number)))}).
              You can save what's here and fill in the gap manually, or upload the missing pages.
            </div>
          )}

          <CardShell icon={ClipboardCheck} title="Extracted transactions" subtitle={`${rows.length} row${rows.length === 1 ? "" : "s"} found — edit anything before saving`}>
            <TransactionReviewTable rows={rows} onChange={setRows} />
          </CardShell>

          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" className="gap-1.5 text-muted-foreground" onClick={handleReject}>
              <X className="h-4 w-4" /> Reject this document
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={saving}
              className="gap-2 bg-gradient-to-r from-primary to-gold text-primary-foreground hover:opacity-90"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm & Save
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
