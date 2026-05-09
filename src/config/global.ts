export const BRAND = {
  name: "Hackathon Review",
  tagline: "AI-assisted hackathon judging dashboard",
  shortName: "HR",
} as const;

export const ROUTES = {
  home: "/",
} as const;

export const FLOW_STEPS = [
  { key: "intake", label: "Intake" },
  { key: "criteria", label: "Criteria" },
  { key: "review", label: "Review" },
  { key: "summary", label: "Summary" },
] as const;

export type FlowStepKey = (typeof FLOW_STEPS)[number]["key"];

export const ACCEPTED_FILES = {
  criteriaImage: {
    accept: "image/*",
    label: "Criteria image (optional)",
    helpText: "PNG, JPG — drop a screenshot of the criteria sheet",
  },
  conceptPdf: {
    accept: ".pdf,application/pdf",
    label: "Hackathon concept PDF (optional)",
    helpText: "PDF — the brief / concept doc for this hackathon",
  },
} as const;

export const ANIMATION = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

export const MOCK_AI_LATENCY_MS = 1400;

/** Files above this size keep only metadata (no base64 sent to the model). */
export const FILE_BASE64_MAX_BYTES = 4 * 1024 * 1024; // 4 MB
