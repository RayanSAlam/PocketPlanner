import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { CardShell } from "@/components/dashboard/CardShell";
import { Dropzone } from "@/components/upload/Dropzone";
import { ProcessingQueueCard, type QueueItem } from "@/components/upload/ProcessingQueueCard";
import { useAuth } from "@/hooks/useAuth";
import { useCreateDocument, useUpdateDocument } from "@/hooks/useDocuments";
import { parseDocument } from "@/lib/parsing";
import type { ParseStage } from "@/lib/parsing/types";

let seq = 0;

export default function UploadPage() {
  const { session } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();

  const patchItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const processFile = async (item: QueueItem) => {
    try {
      if (!session) throw new Error("You're signed out — sign back in and try again");
      const doc = await createDocument.mutateAsync({
        filename: item.file.name,
        mime_type: item.file.type || "application/octet-stream",
        size_bytes: item.file.size,
        status: "uploaded",
      });
      patchItem(item.id, { documentId: doc.id, stage: "scanning" });

      const result = await parseDocument(item.file, (stage: ParseStage, pct) => {
        patchItem(item.id, { stage, progress: pct });
      });

      await updateDocument.mutateAsync({
        id: doc.id,
        patch: {
          doc_type: result.docType,
          status: "review",
          row_count: result.transactions.length,
          extracted_total: result.detectedTotal,
        },
      });

      patchItem(item.id, { stage: "review", result, documentId: doc.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't process this file";
      patchItem(item.id, { stage: "failed", error: message });
      toast.error(`${item.file.name}: ${message}`);
    }
  };

  const handleFiles = (files: File[]) => {
    const items: QueueItem[] = files.map((file) => ({ id: `q${++seq}`, file, stage: "uploading" }));
    setQueue((prev) => [...items, ...prev]);
    items.forEach((item) => void processFile(item));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-6 md:px-8 md:py-8">
      <div>
        <p className="font-mono-data mb-1 text-[11px] uppercase tracking-[0.12em] text-primary">Upload Documents</p>
        <h1 className="font-display text-2xl text-foreground md:text-3xl">Drop a statement, receipt, or CSV</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything is parsed right in your browser — nothing is sent to a third party. You'll review every extracted row before anything is saved.
        </p>
      </div>

      <Dropzone onFiles={handleFiles} />

      {queue.length > 0 && (
        <CardShell icon={UploadCloud} title="Processing queue" subtitle={`${queue.length} file${queue.length === 1 ? "" : "s"}`}>
          <div className="space-y-3">
            {queue.map((item) => (
              <ProcessingQueueCard key={item.id} item={item} />
            ))}
          </div>
        </CardShell>
      )}
    </div>
  );
}
