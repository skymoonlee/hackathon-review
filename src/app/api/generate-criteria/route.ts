import { NextResponse } from "next/server";
import OpenAI from "openai";
import { SERVER_ENV } from "@/config/env";
import { SCORE_SCALES } from "@/config/criteria";
import { getTrack } from "@/config/tracks";
import { renderPdfPages } from "@/lib/pdf-pages";
import type { Criterion, IntakeFile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface GenerateBody {
  trackId?: string;
  repoUrl?: string;
  productUrl?: string;
  criteriaText?: string;
  criteriaImage?: IntakeFile | null;
  conceptPdf?: IntakeFile | null;
}

const SYSTEM_PROMPT = `You are an expert hackathon judge.
Given the materials a judge provides (repo URL, product URL, free-text criteria notes,
optional criteria image, optional hackathon concept PDF), produce a tailored judging rubric.

Return STRICT JSON of the following shape — no prose, no markdown:
{
  "criteria": [
    {
      "id": "kebab-case-stable-id",
      "title": "Short Title",
      "description": "One sentence describing what to look for.",
      "weight": 0.0,                  // 0..1, all weights MUST sum to ~1
      "scale": { "kind": "5-point" | "10-point", "min": 1, "max": 5|10, "step": 1 }
    }
  ]
}

Constraints:
- 3 to 6 criteria total
- Weights sum to 1.0 (±0.01)
- Choose scale based on materials; default to 5-point
- Make criteria specific to the project / hackathon if you have signal; otherwise sensible defaults
- ids must be kebab-case and unique`;

async function buildUserContent(
  body: GenerateBody,
): Promise<OpenAI.Chat.ChatCompletionUserMessageParam["content"]> {
  const track = getTrack(body.trackId);
  const pdfPages = await renderPdfPages(body.conceptPdf);

  const lines: string[] = [
    `Hackathon track: ${track.name} — ${track.description}`,
    `Track emphasis: ${track.emphasis.join(", ")}`,
  ];
  if (body.repoUrl) lines.push(`Repository: ${body.repoUrl}`);
  if (body.productUrl) lines.push(`Product website: ${body.productUrl}`);
  if (body.criteriaText?.trim()) {
    lines.push("Judge's criteria notes:");
    lines.push(body.criteriaText.trim());
  }
  if (body.conceptPdf) {
    const note = body.conceptPdf.oversize
      ? "(too large to attach)"
      : pdfPages.length > 0
        ? `(rendered ${pdfPages.length} page${pdfPages.length === 1 ? "" : "s"} as images below)`
        : "(metadata only — could not render)";
    lines.push(`Hackathon concept PDF: ${body.conceptPdf.name} ${note}`);
  }
  const text = lines.join("\n");

  const content: OpenAI.Chat.ChatCompletionContentPart[] = [{ type: "text", text }];
  if (
    body.criteriaImage &&
    !body.criteriaImage.oversize &&
    body.criteriaImage.base64 &&
    body.criteriaImage.type.startsWith("image/")
  ) {
    content.push({
      type: "image_url",
      image_url: { url: body.criteriaImage.base64 },
    });
  }
  for (const page of pdfPages) {
    content.push({
      type: "image_url",
      image_url: { url: page.dataUrl },
    });
  }
  return content;
}

interface RawCriterion {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  weight?: unknown;
  scale?: { kind?: unknown; min?: unknown; max?: unknown; step?: unknown };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coerceCriteria(raw: unknown): Criterion[] {
  if (!isRecord(raw) || !Array.isArray((raw as { criteria?: unknown }).criteria)) {
    return [];
  }
  const arr = (raw as { criteria: RawCriterion[] }).criteria;
  const out: Criterion[] = [];
  for (const c of arr) {
    if (!isRecord(c)) continue;
    const id = typeof c.id === "string" ? c.id : "";
    const title = typeof c.title === "string" ? c.title : "";
    const description = typeof c.description === "string" ? c.description : "";
    const weight = typeof c.weight === "number" ? c.weight : 0;
    const scale = isRecord(c.scale) ? c.scale : null;
    if (!id || !title) continue;
    const kind = scale && (scale.kind === "10-point" || scale.kind === "5-point")
      ? scale.kind
      : "5-point";
    const fallback = kind === "10-point" ? SCORE_SCALES.tenPoint : SCORE_SCALES.fivePoint;
    out.push({
      id,
      title,
      description,
      weight: Math.max(0, Math.min(1, weight)),
      scale: {
        kind,
        min: typeof scale?.min === "number" ? scale.min : fallback.min,
        max: typeof scale?.max === "number" ? scale.max : fallback.max,
        step: typeof scale?.step === "number" ? scale.step : fallback.step,
      },
    });
  }
  return out;
}

function normalizeWeights(criteria: Criterion[]): Criterion[] {
  const total = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (total <= 0) return criteria.map((c) => ({ ...c, weight: 1 / criteria.length }));
  return criteria.map((c) => ({ ...c, weight: c.weight / total }));
}

export async function POST(request: Request) {
  const body = (await request.json()) as GenerateBody;

  if (!SERVER_ENV.openaiApiKey) {
    return NextResponse.json(
      { criteria: getTrack(body.trackId).template, source: "fallback", reason: "missing_openai_key" },
      { status: 200 },
    );
  }

  const openai = new OpenAI({ apiKey: SERVER_ENV.openaiApiKey });

  try {
    const userContent = await buildUserContent(body);
    const completion = await openai.chat.completions.create({
      model: SERVER_ENV.openaiModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    const parsed: unknown = JSON.parse(text);
    const criteria = normalizeWeights(coerceCriteria(parsed));

    if (criteria.length === 0) {
      return NextResponse.json({
        criteria: getTrack(body.trackId).template,
        source: "fallback",
        reason: "empty_model_output",
      });
    }

    return NextResponse.json({ criteria, source: "openai", model: SERVER_ENV.openaiModel });
  } catch (err) {
    console.error("[generate-criteria] OpenAI call failed:", err);
    return NextResponse.json({
      criteria: getTrack(body.trackId).template,
      source: "fallback",
      reason: err instanceof Error ? err.message : "unknown",
    });
  }
}
