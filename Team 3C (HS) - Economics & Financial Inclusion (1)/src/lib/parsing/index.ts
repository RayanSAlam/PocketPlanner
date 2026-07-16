import type { DocumentParser, ParseResult, ParseStage } from "@/lib/parsing/types";
import { CsvDocumentParser } from "@/lib/parsing/csvParser";
import { PdfDocumentParser } from "@/lib/parsing/pdfParser";
import { ImageDocumentParser } from "@/lib/parsing/imageParser";

const parsers: DocumentParser[] = [new CsvDocumentParser(), new PdfDocumentParser(), new ImageDocumentParser()];

export async function parseDocument(file: File, onProgress?: (stage: ParseStage, pct?: number) => void): Promise<ParseResult> {
  const parser = parsers.find((p) => p.canHandle(file));
  if (!parser) {
    return {
      docType: "unknown",
      transactions: [],
      detectedTotal: null,
      warnings: [`Unsupported file type: ${file.type || file.name}`],
    };
  }
  return parser.parse(file, onProgress);
}

export type { DocType, Confidence, ParsedTransaction, ParseResult, ParseStage, DocumentParser } from "@/lib/parsing/types";
