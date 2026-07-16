import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, MessageCircle, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBudgetAwareTip } from "@/hooks/useBudgetAwareTip";
import { cn } from "@/lib/utils";
import { todayIso } from "@/lib/budgeting/period";

const INTRO_COPY =
  "Hey there, I'm Penny, your PocketPlanner assistant. Tell me what you need and I'll do it — I can add a transaction, run a simulation, or jump you to any page. Click me to talk, or tap the message button to type. What are we planning today?";

const DISMISSED_KEY = "pp_assistant_dismissed";
const INTRO_SEEN_KEY = "pp_assistant_intro_seen";
const BUDGET_TIP_LAST_SHOWN_KEY = "pp_budget_tip_last_shown_date";

interface ChatMessage {
  id: string;
  from: "user" | "penny";
  text: string;
}

function PennyMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="34" r="22" fill="hsl(var(--primary))" />
      <circle cx="24" cy="30" r="3.2" fill="hsl(var(--primary-foreground))" />
      <circle cx="40" cy="30" r="3.2" fill="hsl(var(--primary-foreground))" />
      <path d="M24 41c2.8 2.4 13.2 2.4 16 0" stroke="hsl(var(--primary-foreground))" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <g transform="translate(42 40) rotate(35)">
        <circle cx="0" cy="0" r="7" fill="none" stroke="hsl(var(--gold))" strokeWidth="3" />
        <line x1="5" y1="5" x2="13" y2="13" stroke="hsl(var(--gold))" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function AssistantWidget() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [showBudgetTip, setShowBudgetTip] = useState(false);
  const budgetTip = useBudgetAwareTip();

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    setDismissed(wasDismissed);
    if (!wasDismissed && localStorage.getItem(INTRO_SEEN_KEY) !== "1") {
      setShowIntro(true);
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    }
  }, []);

  // Budget-aware nudge — separate from the one-time intro, this can recur
  // (at most once per day) whenever there's something genuinely worth
  // flagging on the Budgeting page specifically.
  useEffect(() => {
    if (!budgetTip || showIntro) return;
    if (localStorage.getItem(BUDGET_TIP_LAST_SHOWN_KEY) === todayIso()) return;
    setShowBudgetTip(true);
    localStorage.setItem(BUDGET_TIP_LAST_SHOWN_KEY, todayIso());
  }, [budgetTip, showIntro]);

  if (dismissed) return null;

  const dismissWidget = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const openChat = () => {
    setShowIntro(false);
    setChatOpen(true);
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), from: "user", text };
    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: crypto.randomUUID(),
        from: "penny",
        text: "Got it! I'm still learning to actually do things — for now, try the sidebar to jump to what you need.",
      },
    ]);
    setDraft("");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {showIntro && (
        <div className="relative max-w-[260px] rounded-[var(--radius)] bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg">
          <button
            type="button"
            onClick={() => setShowIntro(false)}
            aria-label="Dismiss message"
            className="absolute right-2 top-2 text-primary-foreground/70 hover:text-primary-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="pr-4 leading-relaxed">{INTRO_COPY}</p>
          <div className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 bg-primary" />
        </div>
      )}

      {showBudgetTip && budgetTip && (
        <div className="relative max-w-[260px] rounded-[var(--radius)] bg-gradient-to-br from-primary to-gold px-4 py-3 text-sm text-primary-foreground shadow-lg">
          <button
            type="button"
            onClick={() => setShowBudgetTip(false)}
            aria-label="Dismiss budget tip"
            className="absolute right-2 top-2 text-primary-foreground/70 hover:text-primary-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="pr-4 leading-relaxed">{budgetTip}</p>
          <button
            type="button"
            onClick={() => {
              setShowBudgetTip(false);
              navigate("/budgeting?tab=track");
            }}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium underline-offset-2 hover:underline"
          >
            <Sparkles className="h-3 w-3" /> Show me
          </button>
          <div className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 bg-gold" />
        </div>
      )}

      {chatOpen && (
        <div className="flex h-96 w-80 flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <PennyMascot className="h-6 w-6" />
              <span className="font-display text-sm text-foreground">Penny</span>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setChatOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <p className="mt-6 text-center text-xs text-muted-foreground">
                Ask me anything about your PocketPlanner dashboard.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                    m.from === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}
                >
                  {m.text}
                </div>
              ))
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t border-border p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
              className="h-9"
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <div className="flex items-end gap-2.5">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-label="Assistant settings (coming soon)"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Open assistant chat"
            onClick={openChat}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-primary"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <button
          type="button"
          onClick={openChat}
          aria-label="Talk to Penny, your PocketPlanner assistant"
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold shadow-lg transition-transform hover:scale-105"
        >
          <PennyMascot className="h-9 w-9" />
          <span
            role="button"
            aria-label="Dismiss assistant"
            onClick={(e) => {
              e.stopPropagation();
              dismissWidget();
            }}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </span>
        </button>
      </div>
    </div>
  );
}
