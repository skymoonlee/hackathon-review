import type { ScoreScale } from "@/types";

export const SCORE_SCALES: Record<string, ScoreScale> = {
  fivePoint: { min: 1, max: 5, step: 1, kind: "5-point" },
  tenPoint: { min: 1, max: 10, step: 1, kind: "10-point" },
} as const;

export const SCORE_BAND_LABELS = [
  { threshold: 0.85, label: "Excellent", tone: "success" },
  { threshold: 0.7, label: "Good", tone: "info" },
  { threshold: 0.5, label: "Average", tone: "neutral" },
  { threshold: 0, label: "Needs work", tone: "warn" },
] as const;

