import type { DocType } from "@/lib/parsing/types";

const KEYWORD_RULES: Array<{ pattern: RegExp; docType: DocType }> = [
  { pattern: /\b(pay\s*stub|payroll|gross pay|net pay|earnings statement)\b/i, docType: "pay_stub" },
  { pattern: /\b(statement period|beginning balance|ending balance|account summary)\b/i, docType: "bank_statement" },
  { pattern: /\b(receipt|subtotal|thank you for your purchase|order #)\b/i, docType: "receipt" },
];

// No LLM classifier — MIME/extension first, then filename, then a keyword
// scan of whatever text was actually extracted. Falls back to "unknown"
// rather than guessing, which is what drives the friendly
// "couldn't find financial data" empty state when nothing matches.
export function classifyDocument(file: File, extractedText: string): DocType {
  if (file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")) return "csv_export";

  const nameLower = file.name.toLowerCase();
  if (/statement/.test(nameLower)) return "bank_statement";
  if (/receipt/.test(nameLower)) return "receipt";
  if (/(paystub|pay-stub|payslip)/.test(nameLower)) return "pay_stub";

  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(extractedText)) return rule.docType;
  }

  return "unknown";
}
