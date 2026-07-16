import { Landmark } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";

interface AccountSelectProps {
  value: string | null;
  onChange: (accountId: string) => void;
  className?: string;
}

export function AccountSelect({ value, onChange, className }: AccountSelectProps) {
  const { data: accounts = [] } = useAccounts();

  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Account" />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            <span className="flex items-center gap-2">
              <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
              {a.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
