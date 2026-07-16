import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/transactions/DatePicker";
import { CategorySelect } from "@/components/transactions/CategorySelect";
import { AccountSelect } from "@/components/transactions/AccountSelect";
import { MerchantAutocomplete } from "@/components/transactions/MerchantAutocomplete";
import { useAccounts } from "@/hooks/useAccounts";
import { useInsertTransaction } from "@/hooks/useTransactions";
import { normalizeMerchant, suggestCategoryForMerchant } from "@/lib/merchant";
import { todayIso } from "@/lib/format";

const transactionSchema = z.object({
  kind: z.enum(["expense", "income"]),
  amount: z.coerce.number({ invalid_type_error: "Enter an amount" }).positive("Enter an amount greater than 0"),
  tx_date: z.string().min(1, "Pick a date"),
  description: z.string().trim().min(1, "Enter a merchant or description"),
  category_id: z.string().nullable(),
  account_id: z.string().min(1, "Pick an account"),
  notes: z.string().optional(),
  is_recurring: z.boolean(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  onSuccess?: () => void;
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const { data: accounts } = useAccounts();
  const insertTransaction = useInsertTransaction();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      kind: "expense",
      amount: undefined,
      tx_date: todayIso(),
      description: "",
      category_id: null,
      account_id: accounts?.find((a) => a.is_default)?.id ?? accounts?.[0]?.id ?? "",
      notes: "",
      is_recurring: false,
    },
  });

  // Accounts load async (first render often has none yet) — backfill the
  // default account into the form once they arrive, without clobbering a
  // choice the user already made.
  if (accounts && accounts.length > 0 && !form.getValues("account_id")) {
    form.setValue("account_id", accounts.find((a) => a.is_default)?.id ?? accounts[0].id);
  }

  const handleMerchantBlur = async (value: string) => {
    if (!value.trim() || form.getValues("category_id")) return;
    const suggestion = await suggestCategoryForMerchant(value);
    if (suggestion) form.setValue("category_id", suggestion, { shouldValidate: true });
  };

  const onSubmit = async (values: TransactionFormValues) => {
    const signedAmount = values.kind === "expense" ? -Math.abs(values.amount) : Math.abs(values.amount);
    try {
      await insertTransaction.mutateAsync({
        account_id: values.account_id,
        category_id: values.category_id,
        amount: signedAmount,
        description: values.description.trim(),
        merchant_raw: values.description.trim(),
        merchant_normalized: normalizeMerchant(values.description),
        tx_date: values.tx_date,
        notes: values.notes?.trim() || null,
        is_recurring: values.is_recurring,
        source: "manual",
      });
      toast.success("Transaction added");
      form.reset({
        kind: "expense",
        amount: undefined,
        tx_date: todayIso(),
        description: "",
        category_id: null,
        account_id: values.account_id,
        notes: "",
        is_recurring: false,
      });
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that transaction");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <ToggleGroup
                type="single"
                value={field.value}
                onValueChange={(v) => v && field.onChange(v)}
                className="grid grid-cols-2"
              >
                <ToggleGroupItem
                  value="expense"
                  className="data-[state=on]:bg-destructive/12 data-[state=on]:text-destructive"
                >
                  Expense
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="income"
                  className="data-[state=on]:bg-primary/12 data-[state=on]:text-primary"
                >
                  Income
                </ToggleGroupItem>
              </ToggleGroup>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-6"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tx_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Merchant / description</FormLabel>
              <FormControl>
                <MerchantAutocomplete
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={() => {
                    field.onBlur();
                    void handleMerchantBlur(field.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <CategorySelect value={field.value} onChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account</FormLabel>
                <FormControl>
                  <AccountSelect value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Anything worth remembering about this one" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_recurring"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} id="is_recurring" />
              </FormControl>
              <FormLabel htmlFor="is_recurring" className="cursor-pointer font-normal">
                This repeats regularly
              </FormLabel>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={insertTransaction.isPending}
          className="w-full gap-2 bg-gradient-to-r from-primary to-gold text-primary-foreground hover:opacity-90"
        >
          {insertTransaction.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Add transaction
        </Button>
      </form>
    </Form>
  );
}
