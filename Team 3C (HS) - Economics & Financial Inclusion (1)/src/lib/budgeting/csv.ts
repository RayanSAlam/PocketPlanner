export interface BudgetExportRow {
  category: string;
  group: string;
  budgeted: number;
  rollover: boolean;
}

const CSV_HEADERS = ["Category", "Group", "Budgeted", "Rollover"];

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(rows: BudgetExportRow[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const r of rows) {
    lines.push([escapeCsvField(r.category), escapeCsvField(r.group), r.budgeted.toFixed(2), r.rollover ? "yes" : "no"].join(","));
  }
  return lines.join("\n");
}

export interface CsvImportRow {
  category: string;
  group: string;
  budgeted: number;
  rollover: boolean;
}

export interface CsvParseResult {
  rows: CsvImportRow[];
  errors: string[];
}

// A single small hand-rolled parser (no library) — handles quoted fields
// with embedded commas/newlines, which a naive split(",") would break on.
// Good enough for the "paste from Excel" / "export then re-import" loop
// this feature targets; not a general-purpose RFC 4180 parser.
function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

// Column-mapping: matches header names case-insensitively against a small
// set of accepted aliases, so a file exported by this app AND a
// hand-edited spreadsheet with slightly different headers both work.
const COLUMN_ALIASES: Record<keyof CsvImportRow, string[]> = {
  category: ["category", "name"],
  group: ["group", "group_name", "section"],
  budgeted: ["budgeted", "amount", "amount_budgeted", "budget"],
  rollover: ["rollover", "rollover_enabled", "carry over"],
};

export function detectColumnMapping(header: string[]): Partial<Record<keyof CsvImportRow, number>> {
  const mapping: Partial<Record<keyof CsvImportRow, number>> = {};
  const normalized = header.map((h) => h.trim().toLowerCase());
  for (const key of Object.keys(COLUMN_ALIASES) as (keyof CsvImportRow)[]) {
    const idx = normalized.findIndex((h) => COLUMN_ALIASES[key].includes(h));
    if (idx !== -1) mapping[key] = idx;
  }
  return mapping;
}

export function parseCsvImport(text: string, mapping: Partial<Record<keyof CsvImportRow, number>>): CsvParseResult {
  const allRows = parseCsvLines(text);
  const dataRows = allRows.slice(1); // assumes first row is the header, consistent with detectColumnMapping's input
  const rows: CsvImportRow[] = [];
  const errors: string[] = [];

  if (mapping.category === undefined || mapping.budgeted === undefined) {
    errors.push("Couldn't find a Category and a Budgeted column — map them manually.");
    return { rows, errors };
  }

  dataRows.forEach((cells, i) => {
    const category = cells[mapping.category as number]?.trim();
    const budgetedRaw = cells[mapping.budgeted as number]?.trim();
    if (!category) {
      errors.push(`Row ${i + 2}: missing category name, skipped`);
      return;
    }
    const budgeted = Number(budgetedRaw?.replace(/[$,]/g, ""));
    if (Number.isNaN(budgeted) || budgeted < 0) {
      errors.push(`Row ${i + 2}: "${budgetedRaw}" isn't a valid amount, skipped`);
      return;
    }
    const group = mapping.group !== undefined ? cells[mapping.group]?.trim() || "Needs" : "Needs";
    const rolloverRaw = mapping.rollover !== undefined ? cells[mapping.rollover]?.trim().toLowerCase() : "";
    const rollover = rolloverRaw === "yes" || rolloverRaw === "true" || rolloverRaw === "1";

    rows.push({ category, group, budgeted, rollover });
  });

  return { rows, errors };
}

export function parseCsvHeader(text: string): string[] {
  const lines = parseCsvLines(text);
  return lines[0] ?? [];
}
