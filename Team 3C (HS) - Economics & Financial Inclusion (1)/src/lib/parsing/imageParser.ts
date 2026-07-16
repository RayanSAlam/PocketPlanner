import type { DocumentParser, ParseResult, ParseStage } from "@/lib/parsing/types";
import { extractLineItems, findDetectedTotal } from "@/lib/parsing/extractor";
import { classifyDocument } from "@/lib/parsing/classifier";

const HEIC_EXTENSIONS = [".heic", ".heif"];

function isHeic(file: File): boolean {
  return HEIC_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)) || file.type === "image/heic" || file.type === "image/heif";
}

// Shared by both the image parser and the PDF parser's scanned-page
// fallback. Dynamically imports tesseract.js so its multi-MB WASM core
// only downloads when OCR is actually needed, never in the main bundle.
export async function ocrImageBlob(blob: Blob, onProgress?: (pct: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(blob);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

export class ImageDocumentParser implements DocumentParser {
  canHandle(file: File): boolean {
    return file.type.startsWith("image/") || isHeic(file);
  }

  async parse(file: File, onProgress?: (stage: ParseStage, pct?: number) => void): Promise<ParseResult> {
    onProgress?.("scanning");
    const warnings: string[] = [];

    let blob: Blob = file;
    if (isHeic(file)) {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      blob = Array.isArray(converted) ? converted[0] : converted;
      warnings.push("Converted from HEIC to JPEG for processing.");
    }

    onProgress?.("extracting");
    const text = await ocrImageBlob(blob, (pct) => onProgress?.("extracting", pct));

    const docType = classifyDocument(file, text);
    const transactions = extractLineItems(text);
    const detectedTotal = findDetectedTotal(text);

    if (transactions.length === 0) {
      warnings.push("Couldn't find any date + amount pairs in this image. If it's a real statement or receipt, try a clearer photo or crop closer to the numbers.");
    }

    return { docType, transactions, detectedTotal, warnings };
  }
}
