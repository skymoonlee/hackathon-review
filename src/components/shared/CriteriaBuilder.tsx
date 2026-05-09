"use client";

import { useId, useMemo, useState } from "react";
import { SCORE_SCALES } from "@/config/criteria";
import { COPY } from "@/constants/copy";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { generateCriteria } from "@/lib/mock-ai";
import type { Criterion, IntakeData, ScoreScaleKind } from "@/types";

const SCALE_OPTIONS: { key: ScoreScaleKind; label: string }[] = [
  { key: "5-point", label: "1–5" },
  { key: "10-point", label: "1–10" },
];

interface CriteriaBuilderProps {
  intake: IntakeData;
  initial: Criterion[];
  onStart: (criteria: Criterion[]) => void;
  onBack: () => void;
}

function blankCriterion(): Criterion {
  return {
    id: `c-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    description: "",
    weight: 1,
    scale: SCORE_SCALES.fivePoint,
  };
}

function normalizeWeights(criteria: Criterion[]): Criterion[] {
  const total = criteria.reduce((sum, c) => sum + (c.weight > 0 ? c.weight : 0), 0);
  if (total <= 0) {
    const even = 1 / Math.max(criteria.length, 1);
    return criteria.map((c) => ({ ...c, weight: even }));
  }
  return criteria.map((c) => ({
    ...c,
    weight: (c.weight > 0 ? c.weight : 0) / total,
  }));
}

export function CriteriaBuilder({ intake, initial, onStart, onBack }: CriteriaBuilderProps) {
  const [rows, setRows] = useState<Criterion[]>(
    initial.length > 0 ? initial : [blankCriterion()],
  );
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const formId = useId();

  const valid = rows.length > 0 && rows.every((r) => r.title.trim().length > 0);

  const totalRaw = useMemo(
    () => rows.reduce((s, r) => s + (r.weight > 0 ? r.weight : 0), 0),
    [rows],
  );

  function update(idx: number, patch: Partial<Criterion>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, blankCriterion()]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function suggest() {
    setSuggestError(null);
    if (!intake.criteriaImage && !intake.conceptPdf) {
      setSuggestError(COPY.criteria.suggestNoFiles);
      return;
    }
    setSuggesting(true);
    try {
      const suggested = await generateCriteria(intake);
      if (suggested.length === 0) {
        setSuggestError("No criteria suggested. Try editing manually.");
      } else {
        setRows(suggested);
      }
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Failed to suggest");
    } finally {
      setSuggesting(false);
    }
  }

  function start() {
    if (!valid) return;
    onStart(normalizeWeights(rows));
  }

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        start();
      }}
      className="flex flex-col gap-5"
    >
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-6 text-center text-sm text-[var(--color-foreground-muted)]">
          {COPY.criteria.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row, idx) => (
            <li
              key={row.id}
              className="rounded-2xl border border-[var(--color-border)] bg-white p-4"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px_auto] sm:items-start">
                <div className="flex flex-col gap-2">
                  <Input
                    name={`title-${row.id}`}
                    label={COPY.criteria.fields.title}
                    placeholder={COPY.criteria.placeholders.title}
                    value={row.title}
                    onChange={(e) => update(idx, { title: e.target.value })}
                    required
                  />
                  <Textarea
                    name={`description-${row.id}`}
                    label={COPY.criteria.fields.description}
                    placeholder={COPY.criteria.placeholders.description}
                    value={row.description}
                    onChange={(e) => update(idx, { description: e.target.value })}
                    rows={2}
                  />
                </div>
                <Input
                  name={`weight-${row.id}`}
                  label={COPY.criteria.fields.weight}
                  type="number"
                  min={0}
                  step={0.05}
                  value={row.weight}
                  onChange={(e) =>
                    update(idx, {
                      weight: Number.isFinite(Number(e.target.value))
                        ? Number(e.target.value)
                        : 0,
                    })
                  }
                />
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-[var(--color-foreground)]">
                    {COPY.criteria.fields.scale}
                  </span>
                  <select
                    value={row.scale.kind}
                    onChange={(e) => {
                      const kind = e.target.value as ScoreScaleKind;
                      update(idx, {
                        scale:
                          kind === "10-point"
                            ? SCORE_SCALES.tenPoint
                            : SCORE_SCALES.fivePoint,
                      });
                    }}
                    className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-3 text-sm focus:border-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/10"
                  >
                    {SCALE_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end justify-end pt-1 sm:pt-7">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length <= 1}
                  >
                    {COPY.criteria.removeRow}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-foreground-muted)]">
        <span>
          {COPY.criteria.weightsHint}
          {totalRaw > 0 ? ` Current total: ${totalRaw.toFixed(2)}.` : ""}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={addRow}>
            + {COPY.criteria.addRow}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={suggest}
            loading={suggesting}
          >
            ✨ {suggesting ? COPY.criteria.suggesting : COPY.criteria.suggest}
          </Button>
        </div>
      </div>

      {suggestError ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {suggestError}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          ← {COPY.criteria.back}
        </Button>
        <Button type="submit" size="lg" disabled={!valid}>
          {COPY.criteria.startReview} →
        </Button>
      </div>
    </form>
  );
}
