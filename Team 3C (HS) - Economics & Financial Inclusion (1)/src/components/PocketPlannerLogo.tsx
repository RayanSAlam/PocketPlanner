interface Props {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export const PocketPlannerLogo = ({ size = 40, showWordmark = false, className }: Props) => (
  <div className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path
        d="M 85 30 A 42 42 0 1 0 85 90"
        stroke="hsl(var(--primary))"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <polyline
        points="44,76 66,54 79,63 101,39"
        stroke="hsl(var(--gold))"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="101" cy="39" r="6.5" fill="hsl(var(--gold))" />
    </svg>
    {showWordmark && (
      <span className="font-display text-xl text-foreground">PocketPlanner</span>
    )}
  </div>
);