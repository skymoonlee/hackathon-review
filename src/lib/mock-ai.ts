import { FALLBACK_CRITERIA } from "@/config/criteria";
import type { Criterion, IntakeData } from "@/types";

interface GenerateResponse {
  criteria: Criterion[];
  source?: "openai" | "fallback";
  reason?: string;
  model?: string;
}

/**
 * Calls the server route which uses OpenAI to derive a tailored rubric.
 * Falls back to {@link FALLBACK_CRITERIA} on any failure so the demo never
 * dead-ends.
 */
export async function generateCriteria(intake: IntakeData): Promise<Criterion[]> {
  try {
    const res = await fetch("/api/generate-criteria", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        repoUrl: intake.repoUrl,
        productUrl: intake.productUrl,
        criteriaText: intake.criteriaText,
        criteriaImage: intake.criteriaImage,
        conceptPdf: intake.conceptPdf,
      }),
    });
    if (!res.ok) return FALLBACK_CRITERIA;
    const json = (await res.json()) as GenerateResponse;
    return json.criteria.length > 0 ? json.criteria : FALLBACK_CRITERIA;
  } catch (err) {
    console.error("[generateCriteria] failed:", err);
    return FALLBACK_CRITERIA;
  }
}
