import { getTrack } from "@/config/tracks";
import type { Criterion, IntakeData } from "@/types";

interface GenerateResponse {
  criteria: Criterion[];
  source?: "openai" | "fallback" | "track-template";
  reason?: string;
  model?: string;
}

/**
 * Calls the server route which uses OpenAI to derive a tailored rubric.
 * Falls back to the selected track's template on any failure so the demo never
 * dead-ends.
 */
export async function generateCriteria(intake: IntakeData): Promise<Criterion[]> {
  const trackTemplate = [...getTrack(intake.trackId).template];
  try {
    const res = await fetch("/api/generate-criteria", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trackId: intake.trackId,
        repoUrl: intake.repoUrl,
        productUrl: intake.productUrl,
        criteriaText: intake.criteriaText,
        criteriaImage: intake.criteriaImage,
        conceptPdf: intake.conceptPdf,
      }),
    });
    if (!res.ok) return trackTemplate;
    const json = (await res.json()) as GenerateResponse;
    return json.criteria.length > 0 ? json.criteria : trackTemplate;
  } catch (err) {
    console.error("[generateCriteria] failed:", err);
    return trackTemplate;
  }
}
