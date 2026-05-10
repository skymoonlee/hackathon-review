"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { COPY } from "@/constants/copy";
import { cn } from "@/lib/cn";
import { readSSE } from "@/lib/sse";
import type {
  Criterion,
  IntakeData,
  JudgePersona,
  JudgeVerdict,
  RepoContext,
  TrackContext,
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

type SeatPhase = "idle" | "reasoning" | "score" | "done";

interface SeatState {
  thinking: string;
  verdict: JudgeVerdict | null;
  phase: SeatPhase;
  source: "openai" | "fallback" | null;
  error: string | null;
  streaming: boolean;
}

const INITIAL_SEAT: SeatState = {
  thinking: "",
  verdict: null,
  phase: "idle",
  source: null,
  error: null,
  streaming: false,
};

interface JudgeStreamProps {
  criterion: Criterion;
  intake: IntakeData;
  trackContext: TrackContext;
  repoContext: RepoContext | null;
  personas: JudgePersona[];
  initialVerdict?: JudgeVerdict;
  onVerdict: (verdict: JudgeVerdict) => void;
}

function snapToScaleStep(value: number, criterion: Criterion): number {
  const { min, max, step } = criterion.scale;
  const clamped = Math.max(min, Math.min(max, value));
  const steps = Math.round((clamped - min) / step);
  return Math.max(min, Math.min(max, min + steps * step));
}

function formatMean(raw: number): string {
  // Two decimals, then trim trailing zeros so "8.00" → "8" and "7.50" → "7.5".
  return raw.toFixed(2).replace(/\.?0+$/, "");
}

interface AggregateResult {
  /** Step-snapped integer used to pre-fill the user's score buttons. */
  verdict: JudgeVerdict;
  /** Raw arithmetic mean (no rounding) — for display so the user sees the math. */
  rawMean: number;
  /** Number of personas whose vote went into the mean. */
  contributingCount: number;
}

function aggregateVerdicts(
  perSeat: Record<string, JudgeVerdict>,
  personas: JudgePersona[],
  criterion: Criterion,
): AggregateResult {
  const verdicts = personas
    .map((p) => perSeat[p.id])
    .filter((v): v is JudgeVerdict => Boolean(v));
  const rawMean =
    verdicts.length > 0
      ? verdicts.reduce((s, v) => s + v.value, 0) / verdicts.length
      : criterion.scale.min;
  const snappedValue = snapToScaleStep(rawMean, criterion);

  const rationaleParts = personas
    .map((p) => {
      const v = perSeat[p.id];
      return v ? `${p.company} ${v.value}/${criterion.scale.max}` : null;
    })
    .filter((s): s is string => Boolean(s));

  const evidence: string[] = [];
  const seen = new Set<string>();
  for (const p of personas) {
    const v = perSeat[p.id];
    if (!v) continue;
    for (const e of v.evidence) {
      const key = e.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      evidence.push(`[${p.company}] ${e}`);
      if (evidence.length >= 6) break;
    }
    if (evidence.length >= 6) break;
  }

  const meanLabel = formatMean(rawMean);
  return {
    verdict: {
      criterionId: criterion.id,
      value: snappedValue,
      rationale: rationaleParts.length
        ? `System mean ${meanLabel}/${criterion.scale.max} (snapped → ${snappedValue}) of ${rationaleParts.join(" · ")}`
        : "Panel could not produce a verdict.",
      evidence,
    },
    rawMean,
    contributingCount: verdicts.length,
  };
}

export function JudgeStream({
  criterion,
  intake,
  trackContext,
  repoContext,
  personas,
  initialVerdict,
  onVerdict,
}: JudgeStreamProps) {
  const [seats, setSeats] = useState<Record<string, SeatState>>(() =>
    Object.fromEntries(personas.map((p) => [p.id, { ...INITIAL_SEAT }])),
  );
  const abortsRef = useRef<Map<string, AbortController>>(new Map());
  const onVerdictRef = useRef(onVerdict);
  useEffect(() => {
    onVerdictRef.current = onVerdict;
  }, [onVerdict]);

  // Reset per-seat state whenever personas list changes (criterion swap, etc.)
  useEffect(() => {
    setSeats(
      Object.fromEntries(personas.map((p) => [p.id, { ...INITIAL_SEAT }])),
    );
  }, [personas]);

  const startSeat = useCallback(
    async (persona: JudgePersona) => {
      abortsRef.current.get(persona.id)?.abort();
      const controller = new AbortController();
      abortsRef.current.set(persona.id, controller);

      setSeats((prev) => ({
        ...prev,
        [persona.id]: {
          ...INITIAL_SEAT,
          phase: "reasoning",
          streaming: true,
        },
      }));

      try {
        const res = await fetch("/api/judge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            criterion,
            intake,
            trackContext,
            repoContext,
            persona,
          }),
        });
        if (!res.body) throw new Error("no stream body");

        let acc = "";
        for await (const evt of readSSE<StreamEvent>(res.body, controller.signal)) {
          if (evt.type === "reasoning") {
            acc += evt.delta;
            setSeats((prev) => ({
              ...prev,
              [persona.id]: { ...prev[persona.id]!, thinking: acc },
            }));
          } else if (evt.type === "phase") {
            setSeats((prev) => ({
              ...prev,
              [persona.id]: { ...prev[persona.id]!, phase: "score" },
            }));
          } else if (evt.type === "verdict") {
            setSeats((prev) => ({
              ...prev,
              [persona.id]: {
                ...prev[persona.id]!,
                verdict: evt.verdict,
                source: evt.source,
              },
            }));
          } else if (evt.type === "error") {
            setSeats((prev) => ({
              ...prev,
              [persona.id]: { ...prev[persona.id]!, error: evt.message },
            }));
          } else if (evt.type === "done") {
            setSeats((prev) => ({
              ...prev,
              [persona.id]: {
                ...prev[persona.id]!,
                phase: "done",
                streaming: false,
              },
            }));
          }
        }
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setSeats((prev) => ({
          ...prev,
          [persona.id]: {
            ...prev[persona.id]!,
            error: err instanceof Error ? err.message : "stream failed",
            streaming: false,
            phase: "done",
          },
        }));
      }
    },
    [criterion, intake, trackContext, repoContext],
  );

  const startAll = useCallback(() => {
    personas.forEach((p) => void startSeat(p));
  }, [personas, startSeat]);

  // Auto-run on mount / criterion change. Wait for repoContext if a repo URL was given.
  useEffect(() => {
    if (initialVerdict && personas.length === 0) return;
    const repoUrlProvided = Boolean(intake.repoUrl?.trim());
    if (repoUrlProvided && repoContext === null) return;
    startAll();
    return () => {
      abortsRef.current.forEach((c) => c.abort());
      abortsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criterion.id, repoContext, personas]);

  // Aggregate verdict — push up whenever all seats have settled.
  const allSettled = useMemo(
    () =>
      personas.length > 0 &&
      personas.every((p) => seats[p.id]?.verdict !== null && seats[p.id]?.verdict !== undefined),
    [personas, seats],
  );
  const aggregate = useMemo(() => {
    if (!allSettled) return null;
    const perSeat: Record<string, JudgeVerdict> = {};
    for (const p of personas) {
      const v = seats[p.id]?.verdict;
      if (v) perSeat[p.id] = v;
    }
    return aggregateVerdicts(perSeat, personas, criterion);
  }, [allSettled, personas, seats, criterion]);

  useEffect(() => {
    if (aggregate) onVerdictRef.current(aggregate.verdict);
  }, [aggregate]);

  const anyStreaming = personas.some((p) => seats[p.id]?.streaming);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
            {anyStreaming ? COPY.judge.panelThinking : COPY.judge.panelHeader}
          </div>
          <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
            {COPY.judge.panelHint(personas.length)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {personas.map((p) => (
              <Badge key={p.id} tone="neutral">
                {p.company}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={startAll}
          disabled={anyStreaming}
        >
          {anyStreaming ? COPY.judge.starting : COPY.judge.rerunPanel}
        </Button>
      </div>

      <div
        className={cn(
          "grid gap-3",
          personas.length === 1
            ? "grid-cols-1"
            : personas.length === 2
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
        )}
      >
        {personas.map((p) => (
          <PersonaSeat
            key={p.id}
            persona={p}
            criterion={criterion}
            seat={seats[p.id] ?? INITIAL_SEAT}
          />
        ))}
      </div>

      {aggregate ? (
        <div className="flex flex-col gap-1 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              System mean {formatMean(aggregate.rawMean)} / {criterion.scale.max}
              <span className="ml-2 text-[var(--color-foreground-muted)]">
                → snapped to {aggregate.verdict.value}
              </span>
            </span>
            <Badge tone="info">
              {COPY.judge.panelAverageBadge(aggregate.contributingCount)}
            </Badge>
          </div>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {aggregate.verdict.rationale}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function PersonaSeat({
  persona,
  criterion,
  seat,
}: {
  persona: JudgePersona;
  criterion: Criterion;
  seat: SeatState;
}) {
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (transcriptRef.current && seat.streaming) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [seat.thinking, seat.streaming]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-[var(--color-foreground)]">
            {persona.name}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-foreground-muted)]">
            {persona.company}
          </div>
        </div>
        {seat.source === "fallback" ? (
          <Badge tone="warn">fallback</Badge>
        ) : seat.source === "openai" ? (
          <Badge tone="success">live</Badge>
        ) : seat.streaming ? (
          <Badge tone="info">{seat.phase === "score" ? "scoring" : "thinking"}</Badge>
        ) : null}
      </div>

      {seat.error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
          {seat.error}
        </div>
      ) : null}

      <div
        ref={transcriptRef}
        className={cn(
          "h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-3 py-2 text-xs leading-relaxed text-[var(--color-foreground)]",
          !seat.thinking && "text-[var(--color-foreground-muted)]",
        )}
      >
        {seat.thinking ? (
          <span>
            {seat.thinking}
            {seat.streaming && seat.phase === "reasoning" ? (
              <span className="ml-0.5 inline-block h-2.5 w-1 animate-pulse bg-[var(--color-foreground)]" />
            ) : null}
          </span>
        ) : seat.streaming ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-[var(--color-foreground-muted)] border-t-transparent" />
            {COPY.judge.starting}
          </span>
        ) : (
          <span>{COPY.judge.seatIdle}</span>
        )}
      </div>

      {seat.verdict ? (
        <div className="flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-3 py-2">
          <span className="text-xs font-medium text-[var(--color-foreground)]">
            {COPY.judge.seatScore(seat.verdict.value, criterion.scale.max)}
          </span>
          {seat.verdict.rationale ? (
            <p className="text-[11px] text-[var(--color-foreground-muted)]">
              {seat.verdict.rationale}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
