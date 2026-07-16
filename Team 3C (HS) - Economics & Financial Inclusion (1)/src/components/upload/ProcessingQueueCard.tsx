import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Image as ImageIcon, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ParseResult, ParseStage } from "@/lib/parsing/types";

export interface QueueItem {
  id: string;
  file: File;
  stage: ParseStage;
  progress?: number;
  documentId?: string;
  result?: ParseResult;
  error?: string;
}

const STAGES: { key: ParseStage; label: string }[] = [
  { key: "uploading", label: "Uploading" },
  { key: "scanning", label: "Scanning" },
  { key: "extracting", label: "Extracting" },
  { key: "review", label: "Review" },
];

const fileIcon = (file: File) => {
  if (file.type.startsWith("image/")) return ImageIcon;
  if (file.type === "text/csv" || file.name.endsWith(".csv")) return FileSpreadsheet;
  return FileText;
};

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

export function ProcessingQueueCard({ item }: { item: QueueItem }) {
  const navigate = useNavigate();
  const Icon = fileIcon(item.file);
  const [thumb, setThumb] = useState<string | null>(null);
  const stageIndex = STAGES.findIndex((s) => s.key === item.stage);

  useEffect(() => {
    if (!item.file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(item.file);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [item.file]);

  return (
    <div className="flex items-center gap-4 rounded-[var(--radius)] border border-border bg-card p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
        {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <Icon className="h-5 w-5 text-muted-foreground" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">{item.file.name}</p>
          <span className="shrink-0 text-xs text-muted-foreground">{formatSize(item.file.size)}</span>
        </div>

        {item.stage === "failed" ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> {item.error ?? "Something went wrong"}
          </p>
        ) : (
          <div className="mt-2 flex items-center gap-1.5">
            {STAGES.map((s, i) => (
              <span key={s.key} className="flex flex-1 items-center gap-1.5">
                <span
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i < stageIndex ? "bg-primary" : i === stageIndex ? "bg-gold" : "bg-secondary",
                  )}
                />
              </span>
            ))}
          </div>
        )}
        {item.stage !== "failed" && (
          <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            {STAGES[stageIndex]?.label}
            {typeof item.progress === "number" && item.stage !== "review" ? ` · ${item.progress}%` : ""}
            {item.stage === "review" && item.result && ` · Found ${item.result.transactions.length} transaction${item.result.transactions.length === 1 ? "" : "s"}`}
          </p>
        )}
      </div>

      {item.stage === "review" && item.documentId && (
        <Button
          size="sm"
          className="shrink-0 gap-1.5 bg-gradient-to-r from-primary to-gold text-primary-foreground hover:opacity-90"
          onClick={() => navigate(`/review/${item.documentId}`, { state: { result: item.result, file: item.file } })}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Review
        </Button>
      )}
    </div>
  );
}
