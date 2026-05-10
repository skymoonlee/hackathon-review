import OpenAI from "openai";
import { JUDGE } from "@/config/global";
import { SERVER_ENV } from "@/config/env";
import type {
  Criterion,
  IntakeData,
  RepoContext,
  TrackContext,
} from "@/types";

export const runtime = "nodejs";

interface Body {
  criterion?: Criterion;
  intake?: Pick<IntakeData, "trackId" | "repoUrl" | "productUrl" | "criteriaText">;
  trackContext?: TrackContext;
  repoContext?: RepoContext;
}

const SYSTEM_PROMPT = `You are an expert hackathon judge scoring ONE rubric criterion at a time.

Fairness rules:
- Every team in the same track is judged against the SAME rubric. Do not invent your own criteria.
- Anchor "what great looks like" to the criterion's description. The description's "Top score: …" wording is the bar for the maximum value on the scale.
- Interpret the criterion through the lens of the provided track context (its name, tagline, description, emphasis). The same word can mean different things across tracks — use the track context to disambiguate.
- Do NOT let the project's URL, brand, or category bias the score outside what the rubric measures.

Process you MUST follow, in order, in plain text:
1. Reflect on the criterion AS DEFINED, given the track context, and what "great" looks like on this specific project.
2. Walk the repo signal you were given (file tree, README, key files, shape) and pull out 2–4 concrete observations relevant to THIS criterion. Quote file paths.
3. Weigh strengths vs. gaps for this criterion. Be specific. No generic praise.
4. Decide a numeric score within the criterion's scale.

Output format — strict, two phases separated by a single literal marker line:

${JUDGE.reasoningPrefix}
<your step 1–4 reasoning, written as short conversational paragraphs. one paragraph per step. Korean if the user's notes are Korean, otherwise English. Keep total reasoning under ~250 words.>

${JUDGE.scorePrefix}
{"value": <number>, "rationale": "<one tight sentence justifying the score>", "evidence": ["<short bullet>", "<short bullet>", "..."]}

Hard rules:
- The reasoning section MUST come first and MUST start with the literal "${JUDGE.reasoningPrefix}" line.
- The score section MUST start with the literal "${JUDGE.scorePrefix}" line, on its own line, followed by valid JSON only.
- "value" must be an integer (or step-aligned number) within [scale.min, scale.max].
- "evidence" is a flat array of 2–5 short strings citing file paths or concrete observations from the repo.
- Do NOT wrap JSON in code fences. Do NOT add anything after the JSON.`;

function repoSection(ctx: RepoContext | undefined): string {
  if (!ctx || ctx.source === "none") return "Repo signal: (no GitHub URL provided).";
  if (ctx.source === "fallback") {
    return `Repo signal: unavailable (${ctx.reason ?? "unknown"}). Owner/repo: ${ctx.owner ?? "?"}/${ctx.repo ?? "?"}.`;
  }
  const parts: string[] = [
    `Repo: ${ctx.owner}/${ctx.repo} (parsed live via Nia GitHub).`,
  ];
  if (ctx.tree) {
    parts.push(`# File tree (clipped):\n${ctx.tree}`);
  }
  if (ctx.shape && ctx.shape.length) {
    parts.push(`# Source shape:\n${ctx.shape.join("\n")}`);
  }
  for (const file of ctx.files) {
    parts.push(`# ${file.path}\n${file.content}`);
  }
  return parts.join("\n\n");
}

function buildUserMessage(body: Body): string {
  const c = body.criterion!;
  const t = body.trackContext;
  const lines: string[] = [];

  lines.push("HACKATHON TRACK (every team in this track is judged under the same rubric):");
  if (t) {
    lines.push(`- id: ${t.id}`);
    lines.push(`- name: ${t.name}`);
    if (t.tagline) lines.push(`- tagline: ${t.tagline}`);
    if (t.description) lines.push(`- description: ${t.description}`);
    if (t.emphasis && t.emphasis.length > 0) {
      lines.push(`- emphasis: ${t.emphasis.join(", ")}`);
    }
  } else {
    lines.push(`- id: ${body.intake?.trackId ?? "general"}`);
  }
  lines.push("");
  lines.push(`Project repo URL: ${body.intake?.repoUrl || "(none)"}`);
  lines.push(`Product URL: ${body.intake?.productUrl || "(none)"}`);
  if (body.intake?.criteriaText?.trim()) {
    lines.push("Judge's freeform criteria notes:");
    lines.push(body.intake.criteriaText.trim());
  }
  lines.push("");
  lines.push("CRITERION TO SCORE (interpret strictly within the track context above):");
  lines.push(`- id: ${c.id}`);
  lines.push(`- title: ${c.title}`);
  lines.push(`- description: ${c.description}`);
  lines.push(`- weight: ${c.weight}`);
  lines.push(
    `- scale: ${c.scale.kind} (min=${c.scale.min}, max=${c.scale.max}, step=${c.scale.step})`,
  );
  lines.push("");
  lines.push(repoSection(body.repoContext));
  return lines.join("\n");
}

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

interface ParsedVerdict {
  value: number;
  rationale: string;
  evidence: string[];
}

function tryParseVerdict(jsonText: string, c: Criterion): ParsedVerdict | null {
  try {
    const parsed: unknown = JSON.parse(jsonText.trim());
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    let value = typeof obj.value === "number" ? obj.value : Number(obj.value);
    if (!Number.isFinite(value)) return null;
    value = Math.max(c.scale.min, Math.min(c.scale.max, value));
    const rationale =
      typeof obj.rationale === "string" ? obj.rationale.slice(0, JUDGE.maxRationaleChars) : "";
    const rawEvidence = Array.isArray(obj.evidence) ? obj.evidence : [];
    const evidence = rawEvidence
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
    return { value, rationale, evidence };
  } catch {
    return null;
  }
}

function fallbackVerdict(c: Criterion): ParsedVerdict {
  const mid = Math.round((c.scale.min + c.scale.max) / 2);
  return {
    value: mid,
    rationale: "Model output could not be parsed — defaulting to mid-scale.",
    evidence: [],
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  if (!body.criterion) {
    return new Response("missing criterion", { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => controller.enqueue(encoder.encode(sseEvent(data)));

      if (!SERVER_ENV.openaiApiKey) {
        const fb = fallbackVerdict(body.criterion!);
        send({ type: "reasoning", delta: "OpenAI key missing — skipping live judging." });
        send({
          type: "verdict",
          verdict: { criterionId: body.criterion!.id, ...fb },
          source: "fallback",
        });
        send({ type: "done" });
        controller.close();
        return;
      }

      const openai = new OpenAI({ apiKey: SERVER_ENV.openaiApiKey });
      const userMessage = buildUserMessage(body);

      let phase: "reasoning" | "score" = "reasoning";
      let buffer = "";
      let reasoningTranscript = "";
      let scoreBuffer = "";

      try {
        const response = await openai.chat.completions.create({
          model: SERVER_ENV.openaiModel,
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        });

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (!delta) continue;
          buffer += delta;

          if (phase === "reasoning") {
            const markerIdx = buffer.indexOf(JUDGE.scorePrefix);
            if (markerIdx === -1) {
              // Strip the leading reasoning marker on first emission.
              const cleaned = stripPrefix(buffer, JUDGE.reasoningPrefix);
              const newText = cleaned.slice(reasoningTranscript.length);
              if (newText) {
                reasoningTranscript += newText;
                send({ type: "reasoning", delta: newText });
              }
            } else {
              const beforeMarker = buffer.slice(0, markerIdx);
              const cleaned = stripPrefix(beforeMarker, JUDGE.reasoningPrefix);
              const tail = cleaned.slice(reasoningTranscript.length);
              if (tail) {
                reasoningTranscript += tail;
                send({ type: "reasoning", delta: tail });
              }
              scoreBuffer = buffer.slice(markerIdx + JUDGE.scorePrefix.length);
              phase = "score";
              send({ type: "phase", phase: "score" });
            }
          } else {
            scoreBuffer += delta;
          }
        }

        const verdictParsed =
          tryParseVerdict(scoreBuffer, body.criterion!) ?? fallbackVerdict(body.criterion!);
        send({
          type: "verdict",
          verdict: {
            criterionId: body.criterion!.id,
            ...verdictParsed,
            thinking: reasoningTranscript.trim(),
          },
          source: scoreBuffer.trim() ? "openai" : "fallback",
        });
        send({ type: "done" });
      } catch (err) {
        console.error("[judge] stream failed:", err);
        const fb = fallbackVerdict(body.criterion!);
        send({
          type: "error",
          message: err instanceof Error ? err.message : "stream failed",
        });
        send({
          type: "verdict",
          verdict: { criterionId: body.criterion!.id, ...fb },
          source: "fallback",
        });
        send({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

function stripPrefix(text: string, prefix: string): string {
  const idx = text.indexOf(prefix);
  if (idx === -1) return text;
  // remove the prefix line itself + the newline after it (if present)
  const after = text.slice(idx + prefix.length);
  return after.replace(/^\r?\n/, "");
}
