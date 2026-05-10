import { pdfToPng } from "pdf-to-png-converter";
import { PDF_RENDER } from "@/config/global";
import type { IntakeFile } from "@/types";

export interface PdfPageImage {
  /** 1-indexed page number. */
  page: number;
  /** Full data URL ready for OpenAI `image_url`. */
  dataUrl: string;
}

/** Strip the `data:...;base64,` prefix and return the raw payload. */
function stripDataUrlPrefix(value: string): string {
  const comma = value.indexOf(",");
  return comma === -1 ? value : value.slice(comma + 1);
}

/**
 * Render an uploaded PDF (data URL, base64 payload only is also accepted)
 * into per-page PNG data URLs the multimodal model can consume directly.
 *
 * Returns [] when the file is missing, oversize, or fails to render —
 * callers should treat that as "no PDF signal" and continue.
 */
export async function renderPdfPages(
  file: IntakeFile | null | undefined,
): Promise<PdfPageImage[]> {
  if (!file || file.oversize || !file.base64) return [];
  if (!file.type.includes("pdf")) return [];

  try {
    const buffer = Buffer.from(stripDataUrlPrefix(file.base64), "base64");
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
