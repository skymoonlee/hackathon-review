export type ScoreScaleKind = "5-point" | "10-point";

export interface ScoreScale {
  readonly kind: ScoreScaleKind;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export interface Criterion {
  id: string;
  title: string;
  description: string;
  weight: number; // 0-1, all weights should sum to ~1
  scale: ScoreScale;
}

export interface IntakeFile {
  name: string;
  size: number;
  type: string;
  /** Data URL (base64). Set for inline-attached files (small images). */
  base64?: string;
  /** Public/signed storage URL when the file was uploaded to InsForge Storage. */
  url?: string;
  /** Storage object key (bucket-relative) — needed for delete. */
  key?: string;
  /** Bucket the object was uploaded to (when `url`/`key` are set). */
  bucket?: string;
  /** True if file exceeded the size cap and was kept as metadata only. */
  oversize?: boolean;
}

export interface IntakeData {
  trackId: string;
  repoUrl: string;
  productUrl: string;
  criteriaText: string;
  criteriaImage: IntakeFile | null;
  conceptPdf: IntakeFile | null;
}

export interface ParsedTrack {
  id: string;
  name: string;
  description: string;
  emphasis?: readonly string[];
  /** Optional short tagline — populated when the track came from a saved preset. */
  tagline?: string;
  /** Optional pre-defined rubric — populated when the track came from a saved preset. */
  criteria?: Criterion[];
}

export interface HackathonPreset {
  slug: string;
  name: string;
  description: string;
  isDefault: boolean;
  tracks: ParsedTrack[];
}

/** Resolved track info passed to the judging agent so its scoring is anchored
 *  to the same track context every team is judged under. */
export interface TrackContext {
  id: string;
  name: string;
  tagline?: string;
  description: string;
  emphasis?: readonly string[];
}

export interface ReviewScore {
  criterionId: string;
  value: number;
  notes: string;
}

export interface ReviewSession {
  intake: IntakeData;
  criteria: Criterion[];
  scores: Record<string, ReviewScore>;
}

export interface RepoFile {
  path: string;
  content: string;
}

export interface RepoContext {
  source: "github" | "fallback" | "none";
  reason?: string;
  owner?: string;
  repo?: string;
  tree?: string;
  files: RepoFile[];
  shape?: string[];
}

export interface JudgeVerdict {
  criterionId: string;
  value: number;
  rationale: string;
  evidence: string[];
  /** Free-form thinking transcript captured during streaming. */
  thinking?: string;
}

export interface JudgeChatMessage {
  role: "user" | "assistant";
  content: string;
}
