import {
  Home,
  Utensils,
  Bus,
  ShoppingBag,
  Film,
  HeartPulse,
  Repeat,
  TrendingUp,
  ArrowLeftRight,
  MoreHorizontal,
  Circle,
  Target,
  PiggyBank,
  Plane,
  Car,
  GraduationCap,
  CreditCard,
  Umbrella,
  Gift,
  type LucideIcon,
} from "lucide-react";

// Maps the `icon` string stored in the categories/goals tables to an actual
// lucide-react component. Falls back to a plain circle for any icon name
// this registry doesn't recognize (e.g. a user-created category picked an
// icon added after this list was last updated).
const ICON_REGISTRY: Record<string, LucideIcon> = {
  Home,
  Utensils,
  Bus,
  ShoppingBag,
  Film,
  HeartPulse,
  Repeat,
  TrendingUp,
  ArrowLeftRight,
  MoreHorizontal,
  Target,
  PiggyBank,
  Plane,
  Car,
  GraduationCap,
  CreditCard,
  Umbrella,
  Gift,
};

export function getCategoryIcon(iconName: string | null | undefined): LucideIcon {
  return (iconName && ICON_REGISTRY[iconName]) || Circle;
}

// This app's brand has exactly 3 hues (sage/gold/rose) plus neutrals — no
// new colors are introduced for categories. Swatches are opacity/tint
// variants of those existing tokens, cycled across the seeded categories.
export interface CategorySwatch {
  badge: string; // icon badge background + icon color
  dot: string; // solid background, for chart legends/sparkbars
}

const SWATCHES: Record<string, CategorySwatch> = {
  sage: { badge: "bg-primary/15 text-primary", dot: "bg-primary" },
  "sage-soft": { badge: "bg-secondary text-primary", dot: "bg-primary/60" },
  gold: { badge: "bg-gold/15 text-gold", dot: "bg-gold" },
  "gold-soft": { badge: "bg-gold-tint text-gold", dot: "bg-gold/60" },
  rose: { badge: "bg-destructive/12 text-destructive", dot: "bg-destructive" },
  muted: { badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" },
};

export function getCategorySwatch(swatch: string | null | undefined): CategorySwatch {
  return (swatch && SWATCHES[swatch]) || SWATCHES.muted;
}
