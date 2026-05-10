import { NextResponse } from "next/server";
import OpenAI from "openai";
import { SERVER_ENV } from "@/config/env";
import { HACKATHON_TRACKS } from "@/config/tracks";
import { renderPdfPages } from "@/lib/pdf-pages";
import type { IntakeFile, ParsedTrack, Sponsor } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ParseBody {
  criteriaText?: string;
  criteriaImage?: IntakeFile | null;
  conceptPdf?: IntakeFile | null;
}

const SYSTEM_PROMPT = `You extract hackathon tracks from a hackathon's concept document and NORMALIZE them into clean, canonical category names. You ALSO extract the sponsor companies attached to each track when the source identifies them.
Return STRICT JSON of the following shape — no prose, no markdown:
{
  "tracks": [
    {
      "id": "kebab-case-stable-id",
      "name": "Canonical track name",
      "description": "One sentence describing what this track is about.",
      "emphasis": ["short", "abstract", "tags"],
      "sponsors": [
        { "name": "Sponsor company name", "focus": "what this sponsor cares about for this track (optional, <=8 words)" }
      ]
    }
  ]
}

Constraints:
- 2 to 8 tracks total
- ids must be kebab-case and unique
- DO NOT copy decorative or marketing phrasing from the source verbatim. Translate the source's flavor into the closest standard, conventional track category.
  Examples of normalization:
    * "🛰️ Always-On Agents 🛰️"           -> "AI Agents"
    * "Vibe-Coded Consumer Apps"           -> "Consumer"
    * "Onchain Money Legos"                -> "Web3"
    * "Devtools for the Vibes Era"         -> "Developer Tools"
    * "Healthtech for Humanity"            -> "Social Impact"
- Strip ALL emoji, decorative symbols, ALL-CAPS shouting, and trailing/leading punctuation from the name. Use plain Title Case.
- Prefer short, well-known industry category names (e.g. "AI Agents", "AI / ML", "Developer Tools", "Consumer", "Web3", "Social Impact", "Productivity", "Creative Tools", "Infrastructure").
- emphasis: 2-4 short, ABSTRACT, generic tags describing what the track values (e.g. "autonomy", "reasoning", "planning", "reliability", "DX", "polish", "onchain logic"). NEVER copy the source's specific product names, slogans, emojis, or decorative wording into the tags.
- description: one neutral sentence in plain English describing the category — do not quote the source's marketing copy.
- sponsors:
  * Include only sponsors that the source explicitly attaches to THIS track (look for phrases like "sponsored by", "presented by", logos rendered next to the track header, or company sections that map onto a track).
  * Use the sponsor's plain company name (e.g. "InsForge", "Nia", "Anthropic") — strip emojis, taglines, and "Inc."/"Labs" unless they are part of the canonical brand.
  * focus: one short noun phrase describing what that sponsor cares about for this track (e.g. "backend infra", "code RAG", "developer experience"). Omit if the source gives no signal.
  * If a track has no identifiable sponsors, omit the sponsors field entirely (do not invent sponsors).
- If the source materials are insufficient, infer reasonable tracks from any signal provided.`;

function fallbackTracks(): ParsedTrack[] {
  return HACKATHON_TRACKS.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    emphasis: t.emphasis,
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeName(raw: string): string {
  return raw
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/[*_~`#"']/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–—:|·•]+|[\s\-–—:|·•]+$/g, "")
    .trim();
}

function sanitizeTag(raw: string): string {
  return sanitizeName(raw).toLowerCase();
}

function coerceTracks(raw: unknown): ParsedTrack[] {
  if (!isRecord(raw) || !Array.isArray((raw as { tracks?: unknown }).tracks)) {
    return [];
  }
  const arr = (raw as { tracks: unknown[] }).tracks;
  const out: ParsedTrack[] = [];
  const used = new Set<string>();
  for (const t of arr) {
    if (!isRecord(t)) continue;
    const idRaw = typeof t.id === "string" ? t.id : "";
    const name = typeof t.name === "string" ? sanitizeName(t.name) : "";
    const description =
      typeof t.description === "string" ? sanitizeName(t.description) : "";
    if (!name) continue;
    let id =
      idRaw ||
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ||
      `track-${out.length + 1}`;
    let n = 2;
    const base = id;
    while (used.has(id)) {
      id = `${base}-${n}`;
      n += 1;
    }
    used.add(id);
    const emphasis = Array.isArray(t.emphasis)
      ? t.emphasis
          .filter((x): x is string => typeof x === "string")
          .map(sanitizeTag)
          .filter((x) => x.length > 0)
          .slice(0, 6)
      : undefined;
    const sponsors = coerceSponsors(t.sponsors);
    out.push({ id, name, description, emphasis, sponsors });
  }
  return out;
}

function coerceSponsors(raw: unknown): Sponsor[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Sponsor[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === "string" ? sanitizeName(item.name) : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const focusRaw = typeof item.focus === "string" ? sanitizeName(item.focus) : "";
    const focus = focusRaw ? focusRaw.slice(0, 80) : undefined;
    out.push(focus ? { name, focus } : { name });
    if (out.length >= 4) break;
  }
  return out.length > 0 ? out : undefined;
}

async function buildUserContent(
  body: ParseBody,
): Promise<OpenAI.Chat.ChatCompletionUserMessageParam["content"]> {
  const pdfPages = await renderPdfPages(body.conceptPdf);

  const lines: string[] = [
    "Extract hackathon tracks from the materials below.",
  ];
  if (body.criteriaText?.trim()) {
    lines.push("Judge's notes:");
    lines.push(body.criteriaText.trim());
  }
  if (body.conceptPdf) {
    const note = body.conceptPdf.oversize
      ? "(too large to attach)"
      : pdfPages.length > 0
        ? `(rendered ${pdfPages.length} page${pdfPages.length === 1 ? "" : "s"} as images below)`
        : "(could not render — using filename only)";
    lines.push(`Concept PDF: ${body.conceptPdf.name} ${note}`);
  }
  const text = lines.join("\n");
  const content: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text },
  ];
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

export async function POST(request: Request) {
  const body = (await request.json()) as ParseBody;

  if (!SERVER_ENV.openaiApiKey) {
    return NextResponse.json({
      tracks: fallbackTracks(),
      source: "fallback",
      reason: "missing_openai_key",
    });
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
    const tracks = coerceTracks(parsed);

    if (tracks.length === 0) {
      return NextResponse.json({
        tracks: fallbackTracks(),
        source: "fallback",
        reason: "empty_model_output",
      });
    }

    return NextResponse.json({
      tracks,
      source: "openai",
      model: SERVER_ENV.openaiModel,
    });
  } catch (err) {
    console.error("[parse-tracks] OpenAI call failed:", err);
    return NextResponse.json({
      tracks: fallbackTracks(),
      source: "fallback",
      reason: err instanceof Error ? err.message : "unknown",
    });
  }
}
