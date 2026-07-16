import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/transactions/TransactionForm";

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddDialog({ open, onOpenChange }: QuickAddDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add a transaction</DialogTitle>
          <DialogDescription>Logs straight to your accounts — no need to leave the dashboard.</DialogDescription>
        </DialogHeader>
        <TransactionForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
