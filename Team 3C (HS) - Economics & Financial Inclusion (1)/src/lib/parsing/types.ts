export type DocType = "bank_statement" | "receipt" | "pay_stub" | "csv_export" | "unknown";
export type Confidence = "high" | "medium" | "low";

export interface ParsedTransaction {
  date: string | null; // ISO yyyy-mm-dd
  amount: number | null; // signed — negative = expense, positive = income
  description: string;
  merchantGuess: string | null;
  confidence: Confidence;
  rawSnippet: string;
}

export interface ParseResult {
  docType: DocType;
  transactions: ParsedTransaction[];
  detectedTotal: number | null;
  warnings: string[];
}

export type ParseStage = "uploading" | "scanning" | "extracting" | "review" | "failed";

export interface DocumentParser {
  canHandle(file: File): boolean;
  parse(file: File, onProgress?: (stage: ParseStage, pct?: number) => void): Promise<ParseResult>;
}

// A real LLM-vision parser (Claude, Google Document AI, AWS Textract, etc.)
// could implement this same interface later for messier documents — none
// is wired up in this pass (no API key, out of scope by design: parsing
// here is 100% client-side, free, and needs no credentials).
