import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PocketPlannerLogo } from "@/components/PocketPlannerLogo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "At least 8 characters.")
  .max(72)
  .regex(/[A-Za-z]/, "Must include a letter.")
  .regex(/[0-9]/, "Must include a number.");

export default function ResetPassword() {
  const navigate = useNavigate();
  const pwRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [showC, setShowC] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash automatically and fires PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Also check current session in case event already fired.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    setTimeout(() => pwRef.current?.focus(), 100);
    return () => sub.subscription.unsubscribe();
  }, []);

  const validPw = passwordSchema.safeParse(password).success;
  const matches = password.length > 0 && password === confirm;
  const canSubmit = ready && validPw && matches && !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = passwordSchema.safeParse(password);
    if (!r.success) return setErr(r.error.issues[0].message);
    if (!matches) return setErr("Passwords don't match.");
    setSubmitting(true);
    setErr(undefined);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErr(error.message);
      setSubmitting(false);
      return;
    }
    setSuccess(true);
    toast.success("Password updated.");
    setTimeout(() => navigate("/", { replace: true }), 800);
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 md:px-10">
        <div className="inline-flex items-center gap-2.5">
          <PocketPlannerLogo size={28} />
          <span className="font-display text-lg text-foreground">PocketPlanner</span>
        </div>
      </header>

      <div className="flex-1 flex items-start md:items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="font-mono-data text-[11px] tracking-[0.12em] uppercase text-primary mb-3">
              Reset password
            </p>
            <h1 className="font-display text-4xl md:text-[42px] leading-[1.05] text-foreground">
              Choose a new password.
            </h1>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
            {!ready ? (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Verifying reset link… If nothing happens, request a new link.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div>
                  <Label htmlFor="new-pw">New password</Label>
                  <div className="relative mt-2">
                    <Input
                      id="new-pw"
                      ref={pwRef}
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="h-11 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      aria-label={show ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-muted-foreground hover:text-foreground"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm-pw">Confirm password</Label>
                  <div className="relative mt-2">
                    <Input
                      id="confirm-pw"
                      type={showC ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      className="h-11 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowC((s) => !s)}
                      aria-label={showC ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-muted-foreground hover:text-foreground"
                    >
                      {showC ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {err && (
                  <div
                    role="alert"
                    className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                  >
                    {err}
                  </div>
                )}
                <Button type="submit" disabled={!canSubmit} className="w-full h-11 gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Updating…
                    </>
                  ) : success ? (
                    <>
                      <Check className="w-4 h-4" /> Updated
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}