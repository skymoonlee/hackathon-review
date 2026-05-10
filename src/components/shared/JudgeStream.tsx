"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { COPY } from "@/constants/copy";
import { cn } from "@/lib/cn";
import { readSSE } from "@/lib/sse";
import type {
  Criterion,
  IntakeData,
  JudgeVerdict,
  RepoContext,
} from "@/types";

type StreamEvent =
  | { type: "reasoning"; delta: string }
  | { type: "phase"; phase: "score" }
  | {
      type: "verdict";
      verdict: JudgeVerdict;
      source: "openai" | "fallback";
    }
  | { type: "error"; message: string }
  | { type: "done" };

interface JudgeStreamProps {
  criterion: Criterion;
  intake: IntakeData;
  repoContext: RepoContext | null;
  initialVerdict?: JudgeVerdict;
  onVerdict: (verdict: JudgeVerdict) => void;
}

export function JudgeStream({
  criterion,
  intake,
  repoContext,
  initialVerdict,
  onVerdict,
}: JudgeStreamProps) {
  const [thinking, setThinking] = useState(initialVerdict?.thinking ?? "");
  const [verdict, setVerdict] = useState<JudgeVerdict | null>(initialVerdict ?? null);
  const [streaming, setStreaming] = useState(false);
  const [phase, setPhase] = useState<"reasoning" | "score" | "done">(
    initialVerdict ? "done" : "reasoning",
  );
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"openai" | "fallback" | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const start = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setThinking("");
    setVerdict(null);
    setError(null);
    setSource(null);
    setPhase("reasoning");
    setStreaming(true);

    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ criterion, intake, repoContext }),
      });
      if (!res.body) throw new Error("no stream body");

      let acc = "";
      for await (const evt of readSSE<StreamEvent>(res.body, controller.signal)) {
        if (evt.type === "reasoning") {
          acc += evt.delta;
          setThinking(acc);
        } else if (evt.type === "phase") {
          setPhase("score");
        } else if (evt.type === "verdict") {
          setVerdict(evt.verdict);
          setSource(evt.source);
          onVerdict(evt.verdict);
        } else if (evt.type === "error") {
          setError(evt.message);
        } else if (evt.type === "done") {
          setPhase("done");
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "stream failed");
    } finally {
      setStreaming(false);
    }
  }, [criterion, intake, repoContext, onVerdict]);

  // Auto-run when criterion changes (and on mount), unless we already have a verdict.
  useEffect(() => {
    if (initialVerdict) {
      setThinking(initialVerdict.thinking ?? "");
      setVerdict(initialVerdict);
      setPhase("done");
      return;
    }
    void start();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criterion.id]);

  // Auto-scroll the transcript while streaming.
  useEffect(() => {
    if (transcriptRef.current && streaming) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [thinking, streaming]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
            {streaming || phase !== "done"
              ? COPY.judge.thinkingHeader
              : COPY.judge.verdictHeader}
          </div>
          <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
            {COPY.judge.thinkingHint}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {source === "fallback" ? (
            <Badge tone="warn">fallback</Badge>
          ) : source === "openai" ? (
            <Badge tone="success">live</Badge>
          ) : streaming ? (
            <Badge tone="info">{phase === "score" ? "scoring" : "thinking"}</Badge>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void start()}
            disabled={streaming}
          >
            {streaming ? COPY.judge.starting : COPY.judge.rerun}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {error}
        </div>
      ) : null}

      <div
        ref={transcriptRef}
        className={cn(
          "max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm leading-relaxed text-[var(--color-foreground)]",
          !thinking && "text-[var(--color-foreground-muted)]",
        )}
      >
        {thinking ? (
          <span>
            {thinking}
            {streaming && phase === "reasoning" ? (
              <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[var(--color-foreground)]" />
            ) : null}
          </span>
        ) : streaming ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-foreground-muted)] border-t-transparent" />
            {COPY.judge.starting}
          </span>
        ) : (
          <span>(no transcript yet)</span>
        )}
      </div>

      {verdict ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {COPY.judge.verdictScore(verdict.value, criterion.scale.max)}
            </span>
            {source === "fallback" ? (
              <span className="text-xs text-amber-700">{COPY.judge.fallbackBanner}</span>
            ) : null}
          </div>
          {verdict.rationale ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">{verdict.rationale}</p>
          ) : null}
          {verdict.evidence?.length ? (
            <ul className="mt-1 flex flex-col gap-1 text-xs text-[var(--color-foreground-muted)]">
              {verdict.evidence.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[var(--color-foreground)]">·</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
