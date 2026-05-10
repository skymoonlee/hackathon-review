import { DEFAULT_TRACK_ID, getTrack } from "@/config/tracks";
import type { Criterion, ParsedTrack, TrackContext } from "@/types";

export function resolveTrackContext(
  trackId: string | null | undefined,
  parsedTracks: ParsedTrack[] = [],
  snapshot?: ParsedTrack | null,
): TrackContext {
  const id = trackId || DEFAULT_TRACK_ID;
  const fromSnapshot = snapshot && snapshot.id === id ? snapshot : null;
  const parsed = fromSnapshot ?? parsedTracks.find((t) => t.id === id);
  if (parsed) {
    return {
      id: parsed.id,
      name: parsed.name,
      tagline: parsed.tagline ?? parsed.emphasis?.[0],
      description: parsed.description,
      emphasis: parsed.emphasis,
      sponsors: parsed.sponsors,
    };
  }
  const fallback = getTrack(id);
  return {
    id: fallback.id,
    name: fallback.name,
    tagline: fallback.tagline,
    description: fallback.description,
    emphasis: fallback.emphasis,
  };
}

export function normalizeWeights(criteria: Criterion[]): Criterion[] {
  const total = criteria.reduce((s, c) => s + (c.weight > 0 ? c.weight : 0), 0);
  if (total <= 0) {
    const even = 1 / Math.max(criteria.length, 1);
    return criteria.map((c) => ({ ...c, weight: even }));
  }
  return criteria.map((c) => ({
    ...c,
    weight: (c.weight > 0 ? c.weight : 0) / total,
  }));
}
