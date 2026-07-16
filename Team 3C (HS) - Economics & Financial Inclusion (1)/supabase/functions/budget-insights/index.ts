// Budget Insights — server-side "Analyze my budget" endpoint.
//
// NOT DEPLOYED from this build session: there's no Supabase CLI session
// or service-role access available here (same limitation documented for
// every other backend piece of this feature — see supabase/migrations'
// "HOW TO APPLY" headers). This file is written and ready; to actually use
// it, you'll need to:
//   1. `supabase functions deploy budget-insights`
//   2. `supabase secrets set ANTHROPIC_API_KEY=sk-...`
//   3. Set VITE_ENABLE_AI_INSIGHTS=true in the frontend's env
// Without an ANTHROPIC_API_KEY secret, this function still works — it
// falls back to the same heuristic rules the client uses in "mock mode"
// (src/lib/budgeting/heuristicInsights.ts), just evaluated server-side.
//
// Input: { period: string, rows: { category_id, category_name,
//   amount_budgeted, spent, pct_used }[] } — aggregates only, never raw
// transaction descriptions or merchant names, so nothing sensitive leaves
// the user's own data even in the AI path.
// Output: { insights: { type: "win"|"warning"|"suggestion", message: string,
//   action?: { type: "adjust_budget", categoryId, categoryName, suggested } }[] }
// — identical shape to the client's heuristic fallback, so the UI never
// needs to know which path produced a given result.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RowInput {
  category_id: string;
  category_name: string;
  amount_budgeted: number;
  spent: number;
  pct_used: number;
}

interface Insight {
  type: "win" | "warning" | "suggestion";
  message: string;
  action?: { type: "adjust_budget"; categoryId: string; categoryName: string; suggested: number };
}

// Minimal fallback, deliberately kept simple and self-contained (this
// function's own deploy bundle, not a cross-directory import from the
// frontend, which isn't guaranteed to bundle correctly) — a same-month
// signal only, since this endpoint isn't given multi-month history.
function fallbackInsights(rows: RowInput[]): Insight[] {
  const insights: Insight[] = [];
  for (const r of rows) {
    if (r.amount_budgeted > 0 && r.pct_used > 100) {
      insights.push({ type: "warning", message: `${r.category_name} is over budget this month (${Math.round(r.pct_used)}% used).` });
    } else if (r.amount_budgeted > 0 && r.pct_used < 50) {
      insights.push({ type: "win", message: `${r.category_name} is comfortably under budget this month (${Math.round(r.pct_used)}% used).` });
    }
  }
  return insights.slice(0, 5);
}

const SYSTEM_PROMPT = `You are a calm, non-preachy budgeting assistant. Given aggregated budget-vs-actual data for one month, return 3-5 short insights as STRICT JSON matching this exact shape and nothing else:
{"insights":[{"type":"win"|"warning"|"suggestion","message":"one plain sentence","action":{"type":"adjust_budget","categoryId":"...","categoryName":"...","suggested":123.45}}]}
"action" is optional — only include it for a "suggestion" that proposes a specific new budgeted amount for one category. Never invent categoryId values that weren't given to you. Keep messages realistic and specific with real numbers, never preachy or judgmental. Respond with ONLY the JSON object, no markdown fences, no commentary.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { rows } = (await req.json()) as { period: string; rows: RowInput[] };
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      return new Response(JSON.stringify({ insights: fallbackInsights(rows) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify({ categories: rows }) }],
      }),
    });

    if (!response.ok) {
      // Degrade gracefully rather than surface a raw API error to the UI.
      return new Response(JSON.stringify({ insights: fallbackInsights(rows) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text: string = data.content?.[0]?.text ?? "";
    let parsed: { insights: Insight[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ insights: fallbackInsights(rows) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ insights: parsed.insights.slice(0, 5) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
