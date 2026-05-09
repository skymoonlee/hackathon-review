import { SCORE_SCALES } from "@/config/criteria";
import type { Criterion } from "@/types";

export interface HackathonTrack {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly description: string;
  readonly emphasis: readonly string[];
  readonly template: readonly Criterion[];
}

const T = {
  innovation: (weight: number, description: string): Criterion => ({
    id: "innovation",
    title: "Innovation",
    description,
    weight,
    scale: SCORE_SCALES.fivePoint,
  }),
  impact: (weight: number, description: string): Criterion => ({
    id: "impact",
    title: "Impact",
    description,
    weight,
    scale: SCORE_SCALES.fivePoint,
  }),
  execution: (weight: number, description: string): Criterion => ({
    id: "execution",
    title: "Execution",
    description,
    weight,
    scale: SCORE_SCALES.fivePoint,
  }),
  design: (weight: number, description: string): Criterion => ({
    id: "design",
    title: "Design & UX",
    description,
    weight,
    scale: SCORE_SCALES.fivePoint,
  }),
  presentation: (weight: number, description: string): Criterion => ({
    id: "presentation",
    title: "Presentation",
    description,
    weight,
    scale: SCORE_SCALES.fivePoint,
  }),
} as const;

export const HACKATHON_TRACKS = [
  {
    id: "general",
    name: "General",
    tagline: "Open category",
    description: "Broad innovation across any domain — balanced rubric.",
    emphasis: ["Innovation", "Impact", "Execution", "Design", "Pitch"],
    template: [
      T.innovation(0.25, "Originality and novelty of the idea or approach."),
      T.impact(0.2, "Potential value to users or the target problem space."),
      T.execution(0.25, "Quality, completeness, and polish of what was built."),
      T.design(0.15, "Visual craft, clarity, and end-to-end usability."),
      T.presentation(0.15, "Demo clarity, storytelling, and pitch effectiveness."),
    ],
  },
  {
    id: "ai-ml",
    name: "AI / ML",
    tagline: "Applied intelligence",
    description: "Projects built around models, agents, or AI-native UX.",
    emphasis: ["Model use", "Reliability", "UX of AI", "Novelty"],
    template: [
      T.innovation(0.25, "Novel application of models, agents, or LLM techniques."),
      {
        id: "ai-craft",
        title: "AI craft",
        description: "Prompting, eval, retrieval, or fine-tuning quality.",
        weight: 0.25,
        scale: SCORE_SCALES.fivePoint,
      },
      T.execution(0.2, "End-to-end working build with sensible failure handling."),
      {
        id: "ai-ux",
        title: "UX of AI",
        description: "How well the model output is shaped into a useful interface.",
        weight: 0.15,
        scale: SCORE_SCALES.fivePoint,
      },
      T.presentation(0.15, "Demo clarity and how convincingly the AI value is shown."),
    ],
  },
  {
    id: "developer-tools",
    name: "Developer Tools",
    tagline: "For builders",
    description: "CLIs, SDKs, infra, observability, devex utilities.",
    emphasis: ["DX", "Adoption", "Composability"],
    template: [
      {
        id: "dev-experience",
        title: "Developer experience",
        description: "Install, first-run, docs, and ergonomic API surface.",
        weight: 0.3,
        scale: SCORE_SCALES.fivePoint,
      },
      T.innovation(0.2, "New primitive, abstraction, or workflow improvement."),
      T.execution(0.25, "Tool actually works end-to-end on a representative example."),
      {
        id: "composability",
        title: "Composability",
        description: "Plays well with existing stacks, languages, and pipelines.",
        weight: 0.15,
        scale: SCORE_SCALES.fivePoint,
      },
      T.presentation(0.1, "Live demo and explanation of when to reach for it."),
    ],
  },
  {
    id: "consumer",
    name: "Consumer",
    tagline: "End-user product",
    description: "Web/mobile products focused on delight and daily use.",
    emphasis: ["UX", "Polish", "Stickiness"],
    template: [
      T.design(0.3, "Polish, hierarchy, motion, and overall product feel."),
      {
        id: "stickiness",
        title: "Stickiness",
        description: "Reason a real user would come back tomorrow.",
        weight: 0.2,
        scale: SCORE_SCALES.fivePoint,
      },
      T.execution(0.25, "Working flows on real devices without rough edges."),
      T.innovation(0.15, "Differentiation vs. existing apps in the space."),
      T.presentation(0.1, "Demo storytelling and product narrative."),
    ],
  },
  {
    id: "social-impact",
    name: "Social Impact",
    tagline: "Mission-driven",
    description: "Sustainability, accessibility, civic, education, health.",
    emphasis: ["Impact", "Feasibility", "Inclusivity"],
    template: [
      T.impact(0.3, "Concrete benefit to a real community or environmental outcome."),
      {
        id: "feasibility",
        title: "Feasibility",
        description: "Realistic path from prototype to deployment and adoption.",
        weight: 0.2,
        scale: SCORE_SCALES.fivePoint,
      },
      {
        id: "inclusivity",
        title: "Inclusivity",
        description: "Accessibility and consideration of vulnerable users.",
        weight: 0.15,
        scale: SCORE_SCALES.fivePoint,
      },
      T.execution(0.2, "Quality and completeness of the working build."),
      T.presentation(0.15, "How clearly the mission and outcome are communicated."),
    ],
  },
  {
    id: "web3",
    name: "Web3",
    tagline: "Onchain",
    description: "Smart contracts, wallets, and onchain UX.",
    emphasis: ["Onchain logic", "Security", "UX"],
    template: [
      {
        id: "onchain-logic",
        title: "Onchain logic",
        description: "Soundness and creativity of contract or protocol design.",
        weight: 0.3,
        scale: SCORE_SCALES.fivePoint,
      },
      {
        id: "security",
        title: "Security awareness",
        description: "Threat-model thinking, audits, or safety rails in place.",
        weight: 0.2,
        scale: SCORE_SCALES.fivePoint,
      },
      T.execution(0.2, "Deployable, testable, and demonstrated on a real network."),
      T.design(0.15, "Wallet flows and UX for non-crypto-native users."),
      T.presentation(0.15, "Demo clarity and articulation of why-onchain."),
    ],
  },
] as const satisfies readonly HackathonTrack[];

export type HackathonTrackId = (typeof HACKATHON_TRACKS)[number]["id"];

export const DEFAULT_TRACK_ID: HackathonTrackId = "general";

export function getTrack(id: string | null | undefined): HackathonTrack {
  return (
    HACKATHON_TRACKS.find((t) => t.id === id) ??
    HACKATHON_TRACKS.find((t) => t.id === DEFAULT_TRACK_ID)!
  );
}
