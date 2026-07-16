import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { markSessionOnly, useAuth } from "@/hooks/useAuth";
import { PocketPlannerLogo } from "@/components/PocketPlannerLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Check, MailCheck, ArrowLeft } from "lucide-react";
import { z } from "zod";

/* ---------- validation ---------- */

const emailSchema = z.string().trim().email("Enter a valid email address.").max(255);
const nameSchema = z.string().trim().min(2, "Please enter your full name.").max(100);
const passwordSchema = z
  .string()
  .min(8, "At least 8 characters.")
  .max(72, "Must be under 72 characters.")
  .regex(/[A-Za-z]/, "Must include a letter.")
  .regex(/[0-9]/, "Must include a number.");

/* ---------- helpers ---------- */

function passwordStrength(p: string): { score: number; label: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Excellent"];
  return { score: Math.min(s, 5), label: labels[Math.min(s, 5)] };
}

function mapAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "That email and password don't match. Please try again.";
  if (m.includes("email not confirmed") || m.includes("not confirmed"))
    return "Your email isn't verified yet. Check your inbox for the confirmation link.";
  if (m.includes("user already registered") || m.includes("already been registered") || m.includes("already registered"))
    return "An account with this email already exists. Try logging in instead.";
  if (m.includes("rate") || m.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("weak password") || m.includes("pwned") || m.includes("compromised"))
    return "This password has appeared in a data breach. Please choose a different one.";
  if (m.includes("network") || m.includes("fetch"))
    return "Network problem. Check your connection and try again.";
  return msg || "Something went wrong. Please try again.";
}

/* ============================================================
   Component
   ============================================================ */

type Mode = "login" | "signup";

export default function Auth() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { session, loading: authLoading } = useAuth();

  const initialMode: Mode = params.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [view, setView] = useState<"form" | "verify-sent" | "reset-sent" | "forgot">("form");

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && session) navigate("/", { replace: true });
  }, [authLoading, session, navigate]);

  const handleMode = (m: Mode) => {
    setMode(m);
    setView("form");
    setParams({ mode: m }, { replace: true });
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 md:px-10">
        <Link to="/" className="inline-flex items-center gap-2.5" aria-label="PocketPlanner home">
          <PocketPlannerLogo size={28} />
          <span className="font-display text-lg text-foreground">PocketPlanner</span>
        </Link>
      </header>

      <div className="flex-1 flex items-start md:items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="font-mono-data text-[11px] tracking-[0.12em] uppercase text-primary mb-3">
              {view === "verify-sent"
                ? "Almost there"
                : view === "reset-sent"
                  ? "Check your email"
                  : view === "forgot"
                    ? "Reset password"
                    : mode === "signup"
                      ? "Create your account"
                      : "Welcome back"}
            </p>
            <h1 className="font-display text-4xl md:text-[42px] leading-[1.05] text-foreground">
              {view === "verify-sent"
                ? "Check your inbox."
                : view === "reset-sent"
                  ? "Reset link on its way."
                  : view === "forgot"
                    ? "We'll email you a link."
                    : mode === "signup"
                      ? "Model your money."
                      : "Run the numbers."}
            </h1>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
            {view === "form" && (
              <>
                <Tabs value={mode} onValueChange={(v) => handleMode(v as Mode)} className="mb-6">
                  <TabsList className="grid w-full grid-cols-2 bg-secondary">
                    <TabsTrigger value="login">Log in</TabsTrigger>
                    <TabsTrigger value="signup">Sign up</TabsTrigger>
                  </TabsList>
                  <TabsContent value="login" className="mt-6">
                    <LoginForm onForgot={() => setView("forgot")} />
                  </TabsContent>
                  <TabsContent value="signup" className="mt-6">
                    <SignupForm onSent={() => setView("verify-sent")} />
                  </TabsContent>
                </Tabs>
              </>
            )}

            {view === "forgot" && (
              <ForgotPasswordForm
                onSent={() => setView("reset-sent")}
                onBack={() => setView("form")}
              />
            )}

            {view === "verify-sent" && (
              <ConfirmationState
                icon={<MailCheck className="w-6 h-6 text-primary" aria-hidden />}
                title="Verification email sent"
                message="We sent a link to confirm your email. Open it to activate your account. You can close this tab."
                backLabel="Back to log in"
                onBack={() => {
                  setMode("login");
                  setView("form");
                  setParams({ mode: "login" }, { replace: true });
                }}
              />
            )}

            {view === "reset-sent" && (
              <ConfirmationState
                icon={<MailCheck className="w-6 h-6 text-primary" aria-hidden />}
                title="Reset link sent"
                message="If an account exists for that email, a password reset link is on the way."
                backLabel="Back to log in"
                onBack={() => setView("form")}
              />
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By continuing, you agree to our{" "}
            <a href="#" className="underline hover:text-foreground">
              Terms
            </a>{" "}
            &{" "}
            <a href="#" className="underline hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   Login
   ============================================================ */

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const validEmail = emailSchema.safeParse(email).success;
  const canSubmit = validEmail && password.length > 0 && !submitting;

  const validateField = (field: "email" | "password") => {
    if (field === "email") {
      const r = emailSchema.safeParse(email);
      setErrors((e) => ({ ...e, email: r.success ? undefined : r.error.issues[0].message }));
    }
    if (field === "password") {
      setErrors((e) => ({ ...e, password: password.length === 0 ? "Enter your password." : undefined }));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailR = emailSchema.safeParse(email);
    if (!emailR.success) return setErrors((x) => ({ ...x, email: emailR.error.issues[0].message }));
    if (!password) return setErrors((x) => ({ ...x, password: "Enter your password." }));

    setSubmitting(true);
    setErrors({});

    markSessionOnly(!remember);

    const { error } = await supabase.auth.signInWithPassword({ email: emailR.data, password });
    if (error) {
      const nextCount = failCount + 1;
      setFailCount(nextCount);
      const msg = mapAuthError(error.message);
      setErrors({
        form:
          nextCount >= 3
            ? `${msg} Trouble signing in? Try resetting your password.`
            : msg,
      });
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    toast.success("Welcome back.");
    setTimeout(() => navigate("/", { replace: true }), 600);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <SocialRow />
      <Divider />

      <FieldEmail
        ref={emailRef}
        value={email}
        onChange={setEmail}
        onBlur={() => validateField("email")}
        error={errors.email}
        autoComplete="email"
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="login-password">Password</Label>
          <button
            type="button"
            onClick={onForgot}
            className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Forgot password?
          </button>
        </div>
        <PasswordInput
          id="login-password"
          value={password}
          onChange={setPassword}
          onBlur={() => validateField("password")}
          show={showPw}
          onToggle={() => setShowPw((s) => !s)}
          autoComplete="current-password"
          error={errors.password}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="remember"
          checked={remember}
          onCheckedChange={(v) => setRemember(v === true)}
        />
        <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
          Remember me
        </Label>
      </div>

      {errors.form && <FormError message={errors.form} />}

      <Button type="submit" disabled={!canSubmit} className="w-full h-11 gap-2">
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Signing in…
          </>
        ) : success ? (
          <>
            <Check className="w-4 h-4" aria-hidden /> Signed in
          </>
        ) : (
          "Log in"
        )}
      </Button>
    </form>
  );
}

/* ============================================================
   Signup
   ============================================================ */

function SignupForm({ onSent }: { onSent: () => void }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [honey, setHoney] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const strength = useMemo(() => passwordStrength(password), [password]);

  const validEmail = emailSchema.safeParse(email).success;
  const validName = nameSchema.safeParse(name).success;
  const validPw = passwordSchema.safeParse(password).success;
  const matches = password.length > 0 && password === confirm;
  const canSubmit = validName && validEmail && validPw && matches && agree && !submitting;

  const validate = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (field === "name") {
        const r = nameSchema.safeParse(name);
        next.name = r.success ? undefined : r.error.issues[0].message;
      }
      if (field === "email") {
        const r = emailSchema.safeParse(email);
        next.email = r.success ? undefined : r.error.issues[0].message;
      }
      if (field === "password") {
        const r = passwordSchema.safeParse(password);
        next.password = r.success ? undefined : r.error.issues[0].message;
      }
      if (field === "confirm") {
        next.confirm = password !== confirm ? "Passwords don't match." : undefined;
      }
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Honeypot: silently drop bot submissions
    if (honey) return;

    ["name", "email", "password", "confirm"].forEach(validate);
    if (!validName || !validEmail || !validPw || !matches || !agree) return;

    setSubmitting(true);
    setErrors({});

    const redirect = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirect,
        data: { full_name: name.trim() },
      },
    });

    if (error) {
      setErrors({ form: mapAuthError(error.message) });
      setSubmitting(false);
      return;
    }

    // Ensure user isn't auto-logged in — they must verify first.
    await supabase.auth.signOut();
    onSent();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <SocialRow />
      <Divider />

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={honey}
        onChange={(e) => setHoney(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div>
        <Label htmlFor="signup-name">Full name</Label>
        <Input
          id="signup-name"
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => validate("name")}
          autoComplete="name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "signup-name-err" : undefined}
          className="mt-2 h-11"
        />
        {errors.name && (
          <p id="signup-name-err" className="text-xs text-destructive mt-1.5">
            {errors.name}
          </p>
        )}
      </div>

      <FieldEmail
        value={email}
        onChange={setEmail}
        onBlur={() => validate("email")}
        error={errors.email}
        autoComplete="email"
      />

      <div>
        <Label htmlFor="signup-password">Password</Label>
        <PasswordInput
          id="signup-password"
          value={password}
          onChange={setPassword}
          onBlur={() => validate("password")}
          show={showPw}
          onToggle={() => setShowPw((s) => !s)}
          autoComplete="new-password"
          error={errors.password}
          describedBy="pw-strength"
        />
        {password.length > 0 && (
          <div id="pw-strength" className="mt-2" aria-live="polite">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < strength.score
                      ? strength.score <= 2
                        ? "bg-destructive"
                        : strength.score <= 3
                          ? "bg-gold"
                          : "bg-primary"
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Strength: <span className="text-foreground">{strength.label}</span>
            </p>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="signup-confirm">Confirm password</Label>
        <PasswordInput
          id="signup-confirm"
          value={confirm}
          onChange={setConfirm}
          onBlur={() => validate("confirm")}
          show={showConfirm}
          onToggle={() => setShowConfirm((s) => !s)}
          autoComplete="new-password"
          error={errors.confirm}
        />
      </div>

      <div className="flex items-start gap-2 pt-1">
        <Checkbox
          id="agree"
          checked={agree}
          onCheckedChange={(v) => setAgree(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor="agree" className="text-sm font-normal cursor-pointer leading-relaxed">
          I agree to the{" "}
          <a href="#" className="text-primary underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" className="text-primary underline">
            Privacy Policy
          </a>
          .
        </Label>
      </div>

      {errors.form && <FormError message={errors.form} />}

      <Button type="submit" disabled={!canSubmit} className="w-full h-11 gap-2">
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}

/* ============================================================
   Forgot password
   ============================================================ */

function ForgotPasswordForm({ onSent, onBack }: { onSent: () => void; onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => emailRef.current?.focus(), []);

  const valid = emailSchema.safeParse(email).success;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return setError("Enter a valid email address.");
    setSubmitting(true);
    setError(undefined);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(mapAuthError(error.message));
      setSubmitting(false);
      return;
    }
    onSent();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Back
      </button>
      <p className="text-sm text-muted-foreground">
        Enter your account email and we'll send a reset link.
      </p>
      <FieldEmail
        ref={emailRef}
        value={email}
        onChange={setEmail}
        error={error}
        autoComplete="email"
      />
      <Button type="submit" disabled={!valid || submitting} className="w-full h-11 gap-2">
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Sending link…
          </>
        ) : (
          "Send reset link"
        )}
      </Button>
    </form>
  );
}

/* ============================================================
   Shared UI
   ============================================================ */

function SocialRow() {
  const [busy, setBusy] = useState(false);
  const google = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error(mapAuthError(error.message));
      setBusy(false);
    }
    // On success the browser is redirected to Google, so no further action here.
  };
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-11 gap-2"
      onClick={google}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      Continue with Google
    </Button>
  );
}

function Divider() {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-3 text-[11px] font-mono-data uppercase tracking-[0.12em] text-muted-foreground">
          or with email
        </span>
      </div>
    </div>
  );
}

const FieldEmail = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
    error?: string;
    autoComplete?: string;
  }
>(function FieldEmail({ value, onChange, onBlur, error, autoComplete }, ref) {
  return (
    <div>
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        ref={ref}
        type="email"
        inputMode="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? "email-err" : undefined}
        className="mt-2 h-11"
        placeholder="you@example.com"
      />
      {error && (
        <p id="email-err" className="text-xs text-destructive mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
});

function PasswordInput({
  id,
  value,
  onChange,
  onBlur,
  show,
  onToggle,
  autoComplete,
  error,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  error?: string;
  describedBy?: string;
}) {
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className="mt-2">
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={[errId, describedBy].filter(Boolean).join(" ") || undefined}
          className="h-11 pr-11"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && (
        <p id={errId} className="text-xs text-destructive mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
    >
      {message}
    </div>
  );
}

function ConfirmationState({
  icon,
  title,
  message,
  backLabel,
  onBack,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="text-center py-4">
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h2 className="font-display text-2xl text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{message}</p>
      <Button variant="outline" onClick={onBack} className="w-full h-11">
        {backLabel}
      </Button>
    </div>
  );
}