import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Confidence } from "@/lib/parsing/types";

const LABELS: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence — worth a glance",
  low: "Low confidence — please check this row",
};

const COLORS: Record<Confidence, string> = {
  high: "bg-primary",
  medium: "bg-gold",
  low: "bg-destructive",
};

export function ConfidenceDot({ confidence }: { confidence: Confidence }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${COLORS[confidence]}`} aria-label={LABELS[confidence]} />
      </TooltipTrigger>
      <TooltipContent>{LABELS[confidence]}</TooltipContent>
    </Tooltip>
  );
}
