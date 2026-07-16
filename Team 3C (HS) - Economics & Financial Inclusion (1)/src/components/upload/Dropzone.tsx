import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif", "application/pdf", "text/csv"];
const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif", ".pdf", ".csv"];
const MAX_FILES = 10;
const MAX_SIZE_BYTES = 20 * 1024 * 1024;

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function Dropzone({ onFiles, disabled }: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const accepted: File[] = [];

    for (const file of incoming) {
      if (!isAcceptedFile(file)) {
        toast.error(`${file.name}: unsupported file type`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`${file.name}: over the 20MB limit`);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length > MAX_FILES) {
      toast.error(`Only the first ${MAX_FILES} files were added — that's the limit per upload`);
      accepted.length = MAX_FILES;
    }

    if (accepted.length > 0) onFiles(accepted);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
      }}
      aria-label="Upload documents — drag and drop or click to browse"
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.25rem] border-2 border-dashed px-6 py-14 text-center transition-colors",
        dragOver ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={[...ACCEPTED_TYPES, ...ACCEPTED_EXTENSIONS].join(",")}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
        capture="environment"
      />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
        <UploadCloud className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <p className="font-display text-lg text-foreground">Drag & drop or click to browse</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        PNG, JPG, WEBP, HEIC, PDF, or CSV — up to {MAX_FILES} files, 20MB each. On mobile you can take a photo directly.
      </p>
    </div>
  );
}
