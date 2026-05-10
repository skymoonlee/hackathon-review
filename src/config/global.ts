export const BRAND = {
  name: "Hackathon Reviewer",
  tagline: "AI-assisted hackathon judging dashboard",
  shortName: "HR",
} as const;

export const ROUTES = {
  home: "/",
  submissions: "/submissions",
  submissionDetail: (id: string) => `/submissions/${id}`,
  submissionReview: (id: string) => `/submissions/${id}/review`,
  leaderboard: "/leaderboard",
} as const;

export const NAV_LINKS = [
  { key: "home", label: "Register", href: ROUTES.home },
  { key: "submissions", label: "Submissions", href: ROUTES.submissions },
  { key: "leaderboard", label: "Leaderboard", href: ROUTES.leaderboard },
] as const;

export type NavKey = (typeof NAV_LINKS)[number]["key"];

export const FLOW_STEPS = [
  { key: "intake", label: "Intake" },
  { key: "criteria", label: "Criteria" },
  { key: "publish", label: "Publish" },
] as const;

export const REVIEW_FLOW_STEPS = [
  { key: "review", label: "Score" },
  { key: "summary", label: "Summary" },
] as const;

export type FlowStepKey = (typeof FLOW_STEPS)[number]["key"];
export type ReviewFlowStepKey = (typeof REVIEW_FLOW_STEPS)[number]["key"];

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

/** Cap for files uploaded to InsForge Storage (no JSON body limit, but bound it anyway). */
export const FILE_STORAGE_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

/** Storage bucket names. */
export const STORAGE_BUCKETS = {
  conceptPdfs: "concept-pdfs",
} as const;

/** Database tables (must match migration filenames). */
export const DB_TABLES = {
  submissions: "submissions",
  reviews: "reviews",
  hackathonPresets: "hackathon_presets",
} as const;

/** Nia CLI integration tokens. */
export const NIA = {
  binary: process.env.NIA_BINARY ?? "nia",
  defaultTimeoutMs: 25_000,
  maxStdoutBytes: 256 * 1024,
  maxFileLines: 400,
  /** Files we always try to fetch from a repo for context. */
  keyFiles: [
    "README.md",
    "readme.md",
    "README",
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "go.mod",
    "Cargo.toml",
    "next.config.ts",
    "next.config.js",
    "tsconfig.json",
  ],
  /** Glob patterns probed for shape signal (cheap to bound). */
  shapeGlobs: ["src/**/*.ts", "src/**/*.tsx", "app/**/*.ts", "**/*.py", "**/*.go"],
  /** Cap on entries kept from each glob result. */
  shapeGlobLimit: 60,
  /** Cap on tree entries kept. */
  treeLineLimit: 200,
} as const;

/** Per-criterion judging stream parameters. */
export const JUDGE = {
  reasoningPrefix: "[REASONING]",
  scorePrefix: "[SCORE_JSON]",
  maxRationaleChars: 1200,
  chatHistoryWindow: 12,
} as const;

/** Multi-persona panel parameters. The system runs N parallel judge calls per
 *  criterion and averages the resulting JSON scores — no model-side averaging. */
export const PANEL = {
  /** Cap on parallel personas per criterion (matches buildPersonasForTrack cap). */
  maxPersonas: 4,
  /** Round the panel mean to the nearest multiple of this fraction of the scale step.
   *  0.5 keeps half-steps so a 4-judge spread like 7,8,8,8 lands on 7.75 → 7.5. */
  meanRoundStep: 0.5,
} as const;

/** PDF → page image rendering for multimodal model input. */
export const PDF_RENDER = {
  /** Cap on pages rendered per PDF (controls token/cost + latency). */
  maxPages: 4,
  /** pdfjs viewport scale (1.0 = native, 1.2 ≈ readable + faster). */
  viewportScale: 1.2,
  /** Output MIME for the rendered page. */
  mime: "image/png",
} as const;
