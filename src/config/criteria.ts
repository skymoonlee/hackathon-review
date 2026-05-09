import type { Criterion, ScoreScale } from "@/types";

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

export const FALLBACK_CRITERIA: Criterion[] = [
  {
    id: "innovation",
    title: "Innovation",
    description: "Originality and novelty of the idea or approach.",
    weight: 0.25,
    scale: SCORE_SCALES.fivePoint,
  },
  {
    id: "impact",
    title: "Impact",
    description: "Potential value to users or the target problem space.",
    weight: 0.2,
    scale: SCORE_SCALES.fivePoint,
  },
  {
    id: "execution",
    title: "Execution",
    description: "Quality, completeness, and polish of what was built.",
    weight: 0.25,
    scale: SCORE_SCALES.fivePoint,
  },
  {
    id: "design",
    title: "Design & UX",
    description: "Visual craft, clarity, and end-to-end usability.",
    weight: 0.15,
    scale: SCORE_SCALES.fivePoint,
  },
  {
    id: "presentation",
    title: "Presentation",
    description: "Demo clarity, storytelling, and pitch effectiveness.",
    weight: 0.15,
    scale: SCORE_SCALES.fivePoint,
  },
];
