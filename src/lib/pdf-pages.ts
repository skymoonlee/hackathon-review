import { pdfToPng } from "pdf-to-png-converter";
import { PDF_RENDER } from "@/config/global";
import type { IntakeFile } from "@/types";

export interface PdfPageImage {
  /** 1-indexed page number. */
  page: number;
  /** Full data URL ready for OpenAI `image_url`. */
  dataUrl: string;
}

function stripDataUrlPrefix(value: string): string {
  const comma = value.indexOf(",");
  return comma === -1 ? value : value.slice(comma + 1);
}

async function loadPdfBuffer(file: IntakeFile): Promise<Buffer | null> {
  if (file.url) {
    const res = await fetch(file.url);
    if (!res.ok) {
      console.error(`[pdf-pages] fetch ${file.url} → HTTP ${res.status}`);
      return null;
    }
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  }
  if (file.base64) {
    return Buffer.from(stripDataUrlPrefix(file.base64), "base64");
  }
  return null;
}

/**
 * Render an uploaded PDF (storage URL or base64) into per-page PNG data URLs
 * the multimodal model can consume directly.
 *
 * Returns [] when the file is missing/oversize/unfetchable so callers can
 * just skip the PDF signal and continue.
 */
export async function renderPdfPages(
  file: IntakeFile | null | undefined,
): Promise<PdfPageImage[]> {
  if (!file || file.oversize) return [];
  if (!file.type.includes("pdf")) return [];

  try {
    const buffer = await loadPdfBuffer(file);
    if (!buffer) return [];
    const pages = await pdfToPng(buffer, {
      viewportScale: PDF_RENDER.viewportScale,
      pagesToProcess: Array.from({ length: PDF_RENDER.maxPages }, (_, i) => i + 1),
    });

    const out: PdfPageImage[] = [];
    for (const p of pages) {
      if (!p.content) continue;
      out.push({
        page: p.pageNumber,
        dataUrl: `data:${PDF_RENDER.mime};base64,${p.content.toString("base64")}`,
      });
    }
    return out;
  } catch (err) {
    console.error("[pdf-pages] render failed:", err);
    return [];
  }
}
