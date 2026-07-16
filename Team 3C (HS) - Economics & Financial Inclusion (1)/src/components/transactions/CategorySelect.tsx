import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryIcon, getCategorySwatch } from "@/lib/categories";

interface CategorySelectProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
  className?: string;
}

export function CategorySelect({ value, onChange, className }: CategorySelectProps) {
  const { data: categories = [] } = useCategories();

  return (
    <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-muted-foreground">Uncategorized</span>
        </SelectItem>
        {categories.map((c) => {
          const Icon = getCategoryIcon(c.icon);
          const swatch = getCategorySwatch(c.swatch);
          return (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-md ${swatch.badge}`}>
                  <Icon className="h-3 w-3" strokeWidth={2} />
                </span>
                {c.name}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
