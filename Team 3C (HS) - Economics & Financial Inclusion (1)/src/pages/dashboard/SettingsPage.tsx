import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CardShell } from "@/components/dashboard/CardShell";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { markSessionOnly } from "@/hooks/useAuth";
import { useImpactSettings, useUpdateImpactSettings } from "@/hooks/useImpactSettings";
import { useDeleteAllData } from "@/hooks/useDeleteAllData";

const CONFIRM_PHRASE = "DELETE";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-5 py-6 md:space-y-8 md:px-8 md:py-8">
      <div>
        <p className="font-mono-data mb-1 text-[11px] uppercase tracking-[0.12em] text-primary">Settings</p>
        <h1 className="font-display text-2xl text-foreground md:text-3xl">Account & Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your privacy preferences and data.</p>
      </div>

      <PrivacyCard />
      <DangerZoneCard />
    </div>
  );
}

function PrivacyCard() {
  const { data: settings, isLoading } = useImpactSettings();
  const updateSettings = useUpdateImpactSettings();

  return (
    <CardShell
      icon={ShieldCheck}
      title="Privacy"
      subtitle="Control what PocketPlanner tracks about how you use the app"
    >
      {isLoading || !settings ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-foreground">Usage tracking</p>
            <p className="text-xs text-muted-foreground">
              Lets us measure whether features like the simulator are actually helping (see the "Your Progress" card
              and the occasional "was this helpful?" prompt). Never shared with anyone outside the product team, and
              never shown with your name attached.
            </p>
          </div>
          <Switch
            checked={settings.behavioral_tracking_enabled}
            onCheckedChange={(checked) =>
              updateSettings.mutate({ id: settings.id, behavioral_tracking_enabled: checked })
            }
          />
        </div>
      )}
    </CardShell>
  );
}

function DangerZoneCard() {
  const navigate = useNavigate();
  const deleteAllData = useDeleteAllData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    try {
      await deleteAllData.mutateAsync();
      toast.success("Your data has been deleted.");
      await supabase.auth.signOut();
      markSessionOnly(false);
      navigate("/auth", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete your data — try again");
    }
  };

  return (
    <CardShell icon={Trash2} title="Danger zone" subtitle="Irreversible actions">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-foreground">Delete all my data</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Permanently deletes every account, transaction, budget, goal, uploaded document, and impact record you
          have — everything except your login itself. This cannot be undone. Use this to start completely fresh, or
          if you simply don't want your financial data stored here anymore.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-3"
          onClick={() => setDialogOpen(true)}
        >
          Delete all my data
        </Button>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete everything?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every account, transaction, budget, goal, uploaded document, and impact
              record tied to your login. There's no undo. Type <span className="font-mono-data font-semibold text-foreground">{CONFIRM_PHRASE}</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
            className="font-mono-data"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAllData.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== CONFIRM_PHRASE || deleteAllData.isPending}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAllData.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete everything"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CardShell>
  );
}
