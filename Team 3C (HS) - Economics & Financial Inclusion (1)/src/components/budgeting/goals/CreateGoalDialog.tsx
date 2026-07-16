import { useState } from "react";
import { toast } from "sonner";
import { Target, PiggyBank, Plane, Car, GraduationCap, CreditCard, Umbrella, Gift, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategorySelect } from "@/components/transactions/CategorySelect";
import { DatePicker } from "@/components/transactions/DatePicker";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreateGoal } from "@/hooks/useGoals";
import { cn } from "@/lib/utils";
import type { GoalType } from "@/lib/budgeting/goals";

const ICON_OPTIONS = [
  { name: "Target", Icon: Target },
  { name: "PiggyBank", Icon: PiggyBank },
  { name: "Plane", Icon: Plane },
  { name: "Car", Icon: Car },
  { name: "GraduationCap", Icon: GraduationCap },
  { name: "CreditCard", Icon: CreditCard },
  { name: "Umbrella", Icon: Umbrella },
  { name: "Gift", Icon: Gift },
];

export function CreateGoalDialog({ trigger }: { trigger: React.ReactNode }) {
  const { data: accounts = [] } = useAccounts();
  const createGoal = useCreateGoal();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Target");
  const [type, setType] = useState<GoalType>("save");
  const [targetAmount, setTargetAmount] = useState(0);
  const [startingAmount, setStartingAmount] = useState(0);
  const [targetDate, setTargetDate] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setIcon("Target");
    setType("save");
    setTargetAmount(0);
    setStartingAmount(0);
    setTargetDate("");
    setCategoryId(null);
    setAccountId(null);
  };

  const handleCreate = async () => {
    if (!name.trim() || targetAmount <= 0) {
      toast.error("Give your goal a name and a target amount greater than 0");
      return;
    }
    try {
      await createGoal.mutateAsync({
        name: name.trim(),
        icon,
        type,
        target_amount: targetAmount,
        starting_amount: startingAmount,
        target_date: targetDate || null,
        linked_category_id: categoryId,
        linked_account_id: accountId,
        status: "active",
      });
      toast.success(`${name.trim()} added to your goals`);
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create that goal");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New goal</DialogTitle>
          <DialogDescription>A savings target or a debt to pay down — either way, we'll track your pace toward it.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="goal-name">Name</Label>
            <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Emergency fund" className="mt-1.5" />
          </div>

          <div>
            <Label>Icon</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {ICON_OPTIONS.map(({ name: iconName, Icon }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  aria-label={iconName}
                  aria-pressed={icon === iconName}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                    icon === iconName ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Type</Label>
            <ToggleGroup type="single" value={type} onValueChange={(v) => v && setType(v as GoalType)} className="mt-1.5 justify-start">
              <ToggleGroupItem value="save" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Save up
              </ToggleGroupItem>
              <ToggleGroupItem value="paydown" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Pay down
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="goal-target">{type === "save" ? "Target amount" : "Starting balance"}</Label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="goal-target"
                  type="number"
                  min={0}
                  value={type === "save" ? targetAmount : startingAmount}
                  onChange={(e) => {
                    const v = Math.max(0, parseFloat(e.target.value) || 0);
                    type === "save" ? setTargetAmount(v) : setStartingAmount(v);
                  }}
                  className="pl-6 font-mono-data"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="goal-starting">{type === "save" ? "Already saved" : "Payoff target"}</Label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="goal-starting"
                  type="number"
                  min={0}
                  value={type === "save" ? startingAmount : targetAmount}
                  onChange={(e) => {
                    const v = Math.max(0, parseFloat(e.target.value) || 0);
                    type === "save" ? setStartingAmount(v) : setTargetAmount(v);
                  }}
                  className="pl-6 font-mono-data"
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Target date (optional)</Label>
            <DatePicker value={targetDate} onChange={setTargetDate} className="mt-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Link to a budget category</Label>
              <CategorySelect value={categoryId} onChange={setCategoryId} className="mt-1.5 h-9" />
            </div>
            <div>
              <Label>Link to an account</Label>
              <Select value={accountId ?? "none"} onValueChange={(v) => setAccountId(v === "none" ? null : v)}>
                <SelectTrigger className="mt-1.5 h-9">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createGoal.isPending} className="gap-2 bg-gradient-to-r from-primary to-gold text-primary-foreground hover:opacity-90">
            {createGoal.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
