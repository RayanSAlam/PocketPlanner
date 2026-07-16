import { supabase } from "@/integrations/supabase/client";

// Strips common POS-processor prefixes and trailing store/register numbers
// so "SQ *BLUE BOTTLE 4321" and "Blue Bottle #12" both normalize toward
// "blue bottle" — good enough for grouping/matching without an LLM.
export function normalizeMerchant(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^(sq|tst|pos|pp|sp)\s*\*\s*/i, "")
    .replace(/\s+#?\d{3,}$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function suggestCategoryForMerchant(merchant: string): Promise<string | null> {
  const pattern = normalizeMerchant(merchant);
  if (!pattern) return null;
  const { data, error } = await supabase
    .from("merchant_rules")
    .select("category_id")
    .eq("merchant_pattern", pattern)
    .maybeSingle();
  if (error || !data) return null;
  return data.category_id;
}

export async function upsertMerchantRule(merchant: string, categoryId: string): Promise<void> {
  const pattern = normalizeMerchant(merchant);
  if (!pattern) return;
  await supabase.rpc("upsert_merchant_rule", { p_merchant: pattern, p_category_id: categoryId });
}
