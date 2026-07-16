import type { DocumentParser, ParseResult, ParsedTransaction } from "@/lib/parsing/types";

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

const HEADER_ALIASES = {
  date: ["date", "transaction date", "posted date", "posting date"],
  amount: ["amount", "value", "transaction amount"],
  description: ["description", "merchant", "payee", "memo", "name", "details"],
};

function parseCsvDate(raw: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return raw;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(raw);
  if (us) {
    let [, m, d, y] = us;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseCsvAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const negative = cleaned.startsWith("(") && cleaned.endsWith(")");
  const numeric = parseFloat(cleaned.replace(/[()]/g, ""));
  if (Number.isNaN(numeric)) return null;
  return negative ? -numeric : numeric;
}

export class CsvDocumentParser implements DocumentParser {
  canHandle(file: File): boolean {
    return file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
  }

  async parse(file: File, onProgress?: (stage: "scanning" | "extracting") => void): Promise<ParseResult> {
    onProgress?.("scanning");
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { docType: "csv_export", transactions: [], detectedTotal: null, warnings: ["Empty file"] };

    onProgress?.("extracting");
    // Try matching row 0's cells against known header names first — only
    // treat it as a real header (and skip it) if EVERY column resolves
    // this way. A "does it contain letters" pre-check doesn't work here:
    // an ordinary data row like "2026-07-05,Coffee Shop,-6.25" contains
    // letters too (the description), so it would be misidentified as a
    // header and silently dropped.
    const firstRow = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const headerDateIdx = firstRow.findIndex((h) => HEADER_ALIASES.date.includes(h));
    const headerAmountIdx = firstRow.findIndex((h) => HEADER_ALIASES.amount.includes(h));
    const headerDescIdx = firstRow.findIndex((h) => HEADER_ALIASES.description.includes(h));
    const hasRealHeader = headerDateIdx !== -1 && headerAmountIdx !== -1 && headerDescIdx !== -1;

    const warnings: string[] = [];
    let dateIdx: number;
    let amountIdx: number;
    let descIdx: number;

    if (hasRealHeader) {
      dateIdx = headerDateIdx;
      amountIdx = headerAmountIdx;
      descIdx = headerDescIdx;
    } else {
      warnings.push("Couldn't confidently match column headers — assumed column order (date, description, amount) for every row.");
      dateIdx = 0;
      descIdx = 1;
      amountIdx = 2;
    }

    const dataLines = hasRealHeader ? lines.slice(1) : lines;
    const transactions: ParsedTransaction[] = [];

    for (const line of dataLines) {
      const cells = splitCsvLine(line);
      const dateRaw = cells[dateIdx];
      const amountRaw = cells[amountIdx];
      const descRaw = cells[descIdx];
      if (!dateRaw || !amountRaw) continue;

      const date = parseCsvDate(dateRaw);
      const amount = parseCsvAmount(amountRaw);
      const description = (descRaw ?? "").trim();

      transactions.push({
        date,
        amount,
        description: description || "Imported transaction",
        merchantGuess: description || null,
        confidence: date && amount !== null && description ? "high" : "medium",
        rawSnippet: line,
      });
    }

    return { docType: "csv_export", transactions, detectedTotal: null, warnings };
  }
}
