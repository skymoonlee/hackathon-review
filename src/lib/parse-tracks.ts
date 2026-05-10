import type { IntakeData, ParsedTrack } from "@/types";

interface ParseTracksResponse {
  tracks: ParsedTrack[];
  source?: "openai" | "fallback";
  reason?: string;
  model?: string;
}

export async function parseTracksFromIntake(
  intake: IntakeData,
): Promise<ParsedTrack[]> {
  try {
    const res = await fetch("/api/parse-tracks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        criteriaText: intake.criteriaText,
        criteriaImage: intake.criteriaImage,
        conceptPdf: intake.conceptPdf,
      }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as ParseTracksResponse;
    return json.tracks ?? [];
  } catch (err) {
    console.error("[parseTracksFromIntake] failed:", err);
    return [];
  }
}
