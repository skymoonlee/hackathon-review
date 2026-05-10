import OpenAI from "openai";
import { JUDGE } from "@/config/global";
import { SERVER_ENV } from "@/config/env";
import type {
  Criterion,
  JudgeChatMessage,
  JudgeVerdict,
  RepoContext,
  TrackContext,
} from "@/types";

export const runtime = "nodejs";

interface Body {
  criterion?: Criterion;
  trackContext?: TrackContext;
  verdict?: JudgeVerdict;
  repoContext?: RepoContext;
  messages?: JudgeChatMessage[];
}

const SYSTEM_PROMPT = `You are the same hackathon-judging agent that scored ONE rubric criterion for a project.
The judge is now asking you follow-up questions about that score.

Stay in character: you have access to repo signal (file tree, README, key files) and your prior reasoning.
Cite file paths when defending a point. Keep answers tight (under ~150 words unless asked to elaborate).
If the user pushes back, be willing to revise — say what would change your mind, what additional evidence would shift the score by ±1.
Never invent files or behavior you weren't shown. If the repo signal doesn't contain the answer, say so plainly.`;

function buildContextMessage(body: Body): string {
  const { criterion, trackContext, verdict, repoContext } = body;
  const lines: string[] = [];
  if (trackContext) {
    lines.push("## HACKATHON TRACK");
    lines.push(`${trackContext.name}${trackContext.tagline ? ` — ${trackContext.tagline}` : ""}`);
    if (trackContext.description) lines.push(trackContext.description);
    if (trackContext.emphasis && trackContext.emphasis.length > 0) {
      lines.push(`Emphasis: ${trackContext.emphasis.join(", ")}`);
    }
    lines.push("");
  }
  lines.push(
    "## CRITERION",
    `${criterion!.title} — ${criterion!.description}`,
    `Scale: ${criterion!.scale.kind} (${criterion!.scale.min}–${criterion!.scale.max})`,
    "",
    "## YOUR PRIOR VERDICT",
    `Score: ${verdict!.value} / ${criterion!.scale.max}`,
    `Rationale: ${verdict!.rationale}`,
  );
  if (verdict!.evidence?.length) {
    lines.push("Evidence cited:");
    for (const e of verdict!.evidence) lines.push(`- ${e}`);
  }
  if (verdict!.thinking) {
    lines.push("");
    lines.push("## YOUR PRIOR REASONING TRANSCRIPT");
    lines.push(verdict!.thinking);
  }
  lines.push("");
  lines.push("## REPO SIGNAL");
  if (!repoContext || repoContext.source !== "github") {
    lines.push(`(unavailable: ${repoContext?.reason ?? "no signal"})`);
  } else {
    lines.push(`Repo: ${repoContext.owner}/${repoContext.repo}`);
    if (repoContext.tree) lines.push(`File tree:\n${repoContext.tree}`);
    for (const f of repoContext.files) {
      lines.push(`# ${f.path}`);
      lines.push(f.content);
    }
  }
  return lines.join("\n");
}

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  if (!body.criterion || !body.verdict) {
    return new Response("missing criterion or verdict", { status: 400 });
  }
  const history = (body.messages ?? []).slice(-JUDGE.chatHistoryWindow);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => controller.enqueue(encoder.encode(sseEvent(data)));

      if (!SERVER_ENV.openaiApiKey) {
        send({
          type: "delta",
          delta: "OpenAI key not configured — chat is offline in this demo.",
        });
        send({ type: "done" });
        controller.close();
        return;
      }

      try {
        const openai = new OpenAI({ apiKey: SERVER_ENV.openaiApiKey });
        const response = await openai.chat.completions.create({
          model: SERVER_ENV.openaiModel,
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "system", content: buildContextMessage(body) },
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
        });

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) send({ type: "delta", delta });
        }
        send({ type: "done" });
      } catch (err) {
        console.error("[judge-chat] stream failed:", err);
        send({
          type: "error",
          message: err instanceof Error ? err.message : "stream failed",
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
