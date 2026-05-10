import type { JudgePersona, Sponsor, TrackContext } from "@/types";

/** Personas used when a track has no sponsors attached. Generic but
 *  distinct viewpoints so the panel still shows a multi-judge spread. */
const FALLBACK_PERSONAS: readonly JudgePersona[] = [
  {
    id: "fallback-builder",
    name: "Builder judge",
    company: "Independent",
    viewpoint:
      "Cares about engineering quality, repo signal, and how well the project actually runs.",
  },
  {
    id: "fallback-product",
    name: "Product judge",
    company: "Independent",
    viewpoint:
      "Cares about end-user value, polish, and whether the product solves a real pain point.",
  },
  {
    id: "fallback-strategy",
    name: "Strategy judge",
    company: "Independent",
    viewpoint:
      "Cares about business viability, differentiation, and the size of the opportunity.",
  },
] as const;

function slugifyCompany(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "sponsor"
  );
}

function personaFromSponsor(sponsor: Sponsor, idx: number): JudgePersona {
  const slug = slugifyCompany(sponsor.name);
  const focus = sponsor.focus?.trim();
  return {
    id: `${slug}-rep-${idx + 1}`,
    name: `${sponsor.name} representative`,
    company: sponsor.name,
    viewpoint: focus
      ? `Represents ${sponsor.name}. Cares specifically about ${focus} and how the project showcases ${sponsor.name}'s value to the track.`
      : `Represents ${sponsor.name}. Cares about how well the project leverages ${sponsor.name} and showcases its value to the track.`,
  };
}

/** Build the panel of judge personas for a given track context.
 *  - 1+ sponsors → one persona per sponsor (capped at 4 to bound parallelism).
 *  - No sponsors → 3 generic personas (builder / product / strategy). */
export function buildPersonasForTrack(
  trackContext: TrackContext | null | undefined,
): JudgePersona[] {
  const sponsors = trackContext?.sponsors ?? [];
  if (sponsors.length === 0) return [...FALLBACK_PERSONAS];
  return sponsors.slice(0, 4).map((s, i) => personaFromSponsor(s, i));
}
