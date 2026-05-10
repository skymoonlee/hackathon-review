"use client";

import { useCallback } from "react";
import { COPY } from "@/constants/copy";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { JudgeStream } from "@/components/shared/JudgeStream";
import { JudgeChat } from "@/components/shared/JudgeChat";
import type {
  Criterion,
  IntakeData,
  JudgeChatMessage,
  JudgeVerdict,
  RepoContext,
  ReviewScore,
  TrackContext,
} from "@/types";

interface ReviewStepProps {
  criterion: Criterion;
  index: number;
  total: number;
  score: ReviewScore | undefined;
  intake: IntakeData;
  trackContext: TrackContext;
  repoContext: RepoContext | null;
  verdict?: JudgeVerdict;
  chatHistory?: JudgeChatMessage[];
  onChange: (score: ReviewScore) => void;
  onVerdictChange: (verdict: JudgeVerdict) => void;
  onChatHistoryChange: (messages: JudgeChatMessage[]) => void;
  onNext: () => void;
  onBack: () => void;
  isLast: boolean;
}

function buildOptions(min: number, max: number, step: number) {
  const out: number[] = [];
  for (let v = min; v <= max; v += step) out.push(v);
  return out;
}

export function ReviewStep({
  criterion,
  index,
  total,
  score,
  intake,
  trackContext,
  repoContext,
  verdict,
  chatHistory,
  onChange,
  onVerdictChange,
  onChatHistoryChange,
  onNext,
  onBack,
  isLast,
}: ReviewStepProps) {
  const options = buildOptions(
    criterion.scale.min,
    criterion.scale.max,
    criterion.scale.step,
  );
  const value = score?.value;
  const notes = score?.notes ?? "";

  const progressPct = ((index + 1) / total) * 100;

  const handleVerdict = useCallback(
    (v: JudgeVerdict) => {
      onVerdictChange(v);
      // Pre-fill the user's score from the AI verdict if they haven't picked one yet.
      if (score?.value === undefined) {
        onChange({
          criterionId: criterion.id,
          value: v.value,
          notes: notes,
        });
      }
    },
    [criterion.id, notes, onChange, onVerdictChange, score?.value],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-[var(--color-foreground-muted)]">
          <span>{COPY.review.progress(index + 1, total)}</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
          <div
            className="h-full rounded-full bg-[var(--color-foreground)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {criterion.title}
        </h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">{criterion.description}</p>
      </div>

      <JudgeStream
        criterion={criterion}
        intake={intake}
        trackContext={trackContext}
        repoContext={repoContext}
        initialVerdict={verdict}
        onVerdict={handleVerdict}
      />

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
          {COPY.judge.overrideHint}
        </span>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const selected = value === opt;
            const aiPicked = verdict?.value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  onChange({ criterionId: criterion.id, value: opt, notes })
                }
                className={cn(
                  "min-w-[3rem] rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                  selected
                    ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-white"
                    : aiPicked
                      ? "border-[var(--color-foreground)]/40 bg-white text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)]"
                      : "border-[var(--color-border-strong)] bg-white text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)]",
                )}
              >
                {opt}
                {aiPicked && !selected ? (
                  <span className="ml-1 text-[10px] uppercase tracking-wide text-[var(--color-foreground-muted)]">
                    ai
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <Textarea
        name={`notes-${criterion.id}`}
        label={COPY.review.notesLabel}
        placeholder={COPY.review.notesPlaceholder}
        value={notes}
        rows={3}
        onChange={(e) =>
          onChange({
            criterionId: criterion.id,
            value: value ?? verdict?.value ?? criterion.scale.min,
            notes: e.target.value,
          })
        }
      />

      <JudgeChat
        criterion={criterion}
        trackContext={trackContext}
        verdict={verdict ?? null}
        repoContext={repoContext}
        history={chatHistory}
        onHistoryChange={onChatHistoryChange}
      />

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={index === 0}>
          ← {COPY.review.back}
        </Button>
        <Button
          size="lg"
          onClick={onNext}
          disabled={value === undefined && verdict === undefined}
        >
          {isLast ? COPY.review.finish : `${COPY.review.next} →`}
        </Button>
      </div>
    </div>
  );
}
