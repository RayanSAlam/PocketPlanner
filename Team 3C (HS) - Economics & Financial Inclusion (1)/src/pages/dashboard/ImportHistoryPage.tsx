import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { History, FileText, Image as ImageIcon, FileSpreadsheet, Undo2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardShell, EmptyRow } from "@/components/dashboard/CardShell";
import { useDocuments } from "@/hooks/useDocuments";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type DocStatus = Database["public"]["Enums"]["doc_status"];

const STATUS_LABEL: Record<DocStatus, string> = {
  uploaded: "Uploaded",
  scanning: "Scanning",
  extracting: "Extracting",
  review: "Needs review",
  confirmed: "Confirmed",
  rejected: "Rejected",
  failed: "Failed",
};

const docIcon = (mime: string) => {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "text/csv") return FileSpreadsheet;
  return FileText;
};

export default function ImportHistoryPage() {
  const navigate = useNavigate();
  const { data: documents, isLoading } = useDocuments();
  const queryClient = useQueryClient();
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const handleUndo = async (documentId: string) => {
    setUndoingId(documentId);
    try {
      const { error } = await supabase.rpc("undo_import_batch", { p_document_id: documentId });
      if (error) throw error;
      toast.success("Batch undone — those transactions were removed");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["chart"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't undo that batch");
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-5 py-6 md:px-8 md:py-8">
      <div>
        <p className="font-mono-data mb-1 text-[11px] uppercase tracking-[0.12em] text-primary">Import History</p>
        <h1 className="font-display text-2xl text-foreground md:text-3xl">Every upload, and a way back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every confirmed import can be undone in one click — nothing is permanent until you're sure.</p>
      </div>

      <CardShell icon={History} title="Documents" subtitle={documents ? `${documents.length} total` : "Loading…"}>
        {isLoading ? (
          <EmptyRow>Loading…</EmptyRow>
        ) : !documents || documents.length === 0 ? (
          <EmptyRow>No documents uploaded yet — head to Upload Documents to get started</EmptyRow>
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((doc) => {
              const Icon = docIcon(doc.mime_type);
              const isConfirmed = doc.status === "confirmed";
              const isReviewable = doc.status === "review";
              return (
                <li key={doc.id} className="flex items-center gap-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{doc.filename}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={doc.status === "failed" || doc.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                        {STATUS_LABEL[doc.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(doc.created_at.slice(0, 10))}</span>
                      {doc.row_count > 0 && <span className="text-xs text-muted-foreground">· {doc.row_count} rows</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isReviewable && (
                      <span className="text-xs text-muted-foreground">
                        Extracted data isn't saved between sessions —{" "}
                        <button className="text-primary underline" onClick={() => navigate("/upload")}>
                          re-upload
                        </button>{" "}
                        to review again
                      </span>
                    )}
                    {isConfirmed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-muted-foreground hover:text-destructive"
                        onClick={() => handleUndo(doc.id)}
                        disabled={undoingId === doc.id}
                      >
                        {undoingId === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                        Undo
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardShell>
    </div>
  );
}
