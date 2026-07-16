import type { ParsedTransaction, Confidence } from "@/lib/parsing/types";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec"];

const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
const US_DATE = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/;
const MONTH_NAME_DATE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/i;

const AMOUNT_PATTERN = /\(?-?\$?\s?\d+(?:,\d{3})*\.\d{2}\)?/g;

interface DateMatch {
  iso: string;
  raw: string;
  index: number;
  yearInferred: boolean;
}

function findDate(line: string): DateMatch | null {
  const iso = ISO_DATE.exec(line);
  if (iso) return { iso: `${iso[1]}-${iso[2]}-${iso[3]}`, raw: iso[0], index: iso.index, yearInferred: false };

  const us = US_DATE.exec(line);
  if (us) {
    let [, m, d, y] = us;
    if (y.length === 2) y = `20${y}`;
    const mm = m.padStart(2, "0");
    const dd = d.padStart(2, "0");
    if (Number(mm) <= 12 && Number(dd) <= 31) {
      return { iso: `${y}-${mm}-${dd}`, raw: us[0], index: us.index, yearInferred: false };
    }
  }

  const named = MONTH_NAME_DATE.exec(line);
  if (named) {
    const monthIdx = MONTHS.findIndex((m) => named[1].toLowerCase().startsWith(m));
    if (monthIdx >= 0) {
      const monthNum = String((monthIdx >= 4 && named[1].toLowerCase().startsWith("sep") ? 9 : monthIdx + 1)).padStart(2, "0");
      const day = named[2].padStart(2, "0");
      const year = named[3] ?? String(new Date().getFullYear());
      return { iso: `${year}-${monthNum}-${day}`, raw: named[0], index: named.index, yearInferred: !named[3] };
    }
  }

  return null;
}

interface AmountMatch {
  value: number;
  raw: string;
  index: number;
}

function findAmounts(line: string): AmountMatch[] {
  const matches: AmountMatch[] = [];
  let m: RegExpExecArray | null;
  AMOUNT_PATTERN.lastIndex = 0;
  while ((m = AMOUNT_PATTERN.exec(line))) {
    // Keep `raw` as the untrimmed match text — cleanDescription() cuts
    // `[index, index + raw.length)` out of the line, so trimming here
    // would shorten `raw` without moving `index`, leaving a stray
    // character (e.g. the pattern's optional leading space) behind.
    const raw = m[0];
    const trimmed = raw.trim();
    // parseFloat already handles a leading "-" correctly on its own; only
    // parenthesized amounts — accounting notation for negative, e.g.
    // "(86.42)" — need an explicit sign flip after stripping the parens.
    const isParenNegative = trimmed.startsWith("(");
    const numeric = parseFloat(trimmed.replace(/[()$,\s]/g, ""));
    if (Number.isNaN(numeric)) continue;
    matches.push({ value: isParenNegative ? -Math.abs(numeric) : numeric, raw, index: m.index });
  }
  return matches;
}

function cleanDescription(line: string, date: DateMatch | null, amount: AmountMatch | null): string {
  let text = line;
  const cuts: Array<{ start: number; end: number }> = [];
  if (date) cuts.push({ start: date.index, end: date.index + date.raw.length });
  if (amount) cuts.push({ start: amount.index, end: amount.index + amount.raw.length });
  cuts.sort((a, b) => b.start - a.start);
  for (const c of cuts) text = text.slice(0, c.start) + " " + text.slice(c.end);
  return text.replace(/[|_•\-–—]+/g, " ").replace(/\s+/g, " ").trim();
}

// This is the honest limitation of a keyless, local-only pipeline: it
// looks for lines that carry BOTH a recognizable date and a dollar amount
// on the same line. Statements that split a transaction's date and amount
// across separate lines will be missed here — an LLM would infer that
// context; regex can't. Missed/ambiguous rows show up as low confidence
// or simply don't appear, which is why Review & Confirm lets users fix or
// add rows by hand rather than trusting this output blindly.
export function extractLineItems(text: string): ParsedTransaction[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedTransaction[] = [];

  for (const line of lines) {
    const date = findDate(line);
    if (!date) continue;

    const amounts = findAmounts(line);
    if (amounts.length === 0) continue;

    const amount = amounts[0];
    const description = cleanDescription(line, date, amount);
    if (!description) continue;

    let confidence: Confidence = "high";
    if (amounts.length > 1) confidence = "medium";
    if (date.yearInferred) confidence = confidence === "high" ? "medium" : "low";
    if (description.length < 3) confidence = "low";

    results.push({
      date: date.iso,
      amount: amount.value,
      description,
      merchantGuess: description,
      confidence,
      rawSnippet: line,
    });
  }

  return results;
}

export function findDetectedTotal(text: string): number | null {
  const match = /total[^\n]{0,20}?(\(?-?\$?\s?\d+(?:,\d{3})*\.\d{2}\)?)/i.exec(text);
  if (!match) return null;
  const numeric = parseFloat(match[1].replace(/[()$,\s]/g, ""));
  if (Number.isNaN(numeric)) return null;
  return match[1].trim().startsWith("(") ? -numeric : numeric;
}
