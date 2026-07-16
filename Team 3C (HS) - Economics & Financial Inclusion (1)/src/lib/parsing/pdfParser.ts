import type { DocumentParser, ParseResult, ParseStage } from "@/lib/parsing/types";
import { extractLineItems, findDetectedTotal } from "@/lib/parsing/extractor";
import { classifyDocument } from "@/lib/parsing/classifier";
import { ocrImageBlob } from "@/lib/parsing/imageParser";

// Below this many characters per page (averaged), a PDF is treated as
// scanned/image-only rather than a real digital document with a text
// layer, and gets OCR'd page-by-page instead.
const SPARSE_TEXT_CHARS_PER_PAGE = 40;

export class PdfDocumentParser implements DocumentParser {
  canHandle(file: File): boolean {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  }

  async parse(file: File, onProgress?: (stage: ParseStage, pct?: number) => void): Promise<ParseResult> {
    onProgress?.("scanning");
    const pdfjsLib = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const warnings: string[] = [];

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      fullText += pageText + "\n";
      onProgress?.("scanning", Math.round((i / pdf.numPages) * 50));
    }

    if (fullText.trim().length < SPARSE_TEXT_CHARS_PER_PAGE * pdf.numPages) {
      warnings.push("This PDF looks scanned (little to no embedded text) — ran OCR on each page instead, which is slower and less accurate than a real text layer.");
      fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
        if (!blob) continue;
        const pageText = await ocrImageBlob(blob, (pct) => {
          const overall = Math.round(((i - 1) / pdf.numPages) * 100 + pct / pdf.numPages);
          onProgress?.("extracting", overall);
        });
        fullText += pageText + "\n";
      }
    }

    onProgress?.("extracting");
    const docType = classifyDocument(file, fullText);
    const transactions = extractLineItems(fullText);
    const detectedTotal = findDetectedTotal(fullText);

    if (transactions.length === 0) {
      warnings.push("Couldn't find any date + amount pairs in this PDF.");
    }

    return { docType, transactions, detectedTotal, warnings };
  }
}
