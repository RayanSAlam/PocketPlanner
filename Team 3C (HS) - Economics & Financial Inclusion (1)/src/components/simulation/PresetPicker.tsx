import { Sparkles } from "lucide-react";
import { PRESETS } from "@/lib/simulation/presets";
import { cn } from "@/lib/utils";

interface PresetPickerProps {
  onSelect: (presetId: string) => void;
  activePresetId?: string | null;
}

export function PresetPicker({ onSelect, activePresetId }: PresetPickerProps) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-gold" /> Quick start
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.id)}
            className={cn(
              "rounded-[var(--radius)] border p-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40",
              activePresetId === preset.id ? "border-primary bg-primary/8" : "border-border bg-card",
            )}
          >
            <p className="font-display text-sm text-foreground">{preset.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
