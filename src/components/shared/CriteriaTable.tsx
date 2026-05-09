"use client";

import { useId } from "react";
import { COPY } from "@/constants/copy";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SCORE_SCALES } from "@/config/criteria";
import type { Criterion, ScoreScaleKind } from "@/types";

interface CriteriaTableProps {
  criteria: Criterion[];
  onChange: (next: Criterion[]) => void;
  onStart: () => void;
  onBack: () => void;
  onSuggest?: () => void;
  suggesting?: boolean;
  canSuggest?: boolean;
}

const SCALE_OPTIONS = [
  { value: "5-point" as ScoreScaleKind, label: "1–5" },
  { value: "10-point" as ScoreScaleKind, label: "1–10" },
] as const;

function makeId(title: string, existing: Criterion[]): string {
  const base =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "criterion";
  let id = base;
  let n = 2;
  const used = new Set(existing.map((c) => c.id));
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

function emptyCriterion(existing: Criterion[]): Criterion {
  return {
    id: makeId("custom", existing),
    title: "",
    description: "",
    weight: 0.1,
    scale: SCORE_SCALES.fivePoint,
  };
}

export function CriteriaTable({
  criteria,
  onChange,
  onStart,
  onBack,
  onSuggest,
  suggesting = false,
  canSuggest = false,
}: CriteriaTableProps) {
  const totalWeight = criteria.reduce((s, c) => s + (c.weight || 0), 0);
  const headingId = useId();

  function update(index: number, patch: Partial<Criterion>) {
    onChange(criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function remove(index: number) {
    onChange(criteria.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...criteria, emptyCriterion(criteria)]);
  }

  function setScale(index: number, kind: ScoreScaleKind) {
    const scale = kind === "10-point" ? SCORE_SCALES.tenPoint : SCORE_SCALES.fivePoint;
    update(index, { scale });
  }

  return (
    <div className="flex flex-col gap-5">
      {onSuggest ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-4 py-3">
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {canSuggest ? COPY.criteria.suggest : COPY.criteria.suggestNoFiles}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={suggesting}
            disabled={!canSuggest || suggesting}
            onClick={onSuggest}
          >
            {suggesting ? COPY.criteria.suggesting : COPY.criteria.suggest}
          </Button>
        </div>
      ) : null}

      {criteria.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] py-10 text-center text-sm text-[var(--color-foreground-muted)]">
          {COPY.criteria.empty}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
          <table
            aria-labelledby={headingId}
            className="w-full text-left text-sm"
          >
            <thead className="bg-[var(--color-surface-muted)] text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {COPY.criteria.columns.criterion}
                </th>
                <th className="px-4 py-3 font-medium">
                  {COPY.criteria.columns.description}
                </th>
                <th className="w-28 px-4 py-3 font-medium">
                  {COPY.criteria.columns.weight}
                </th>
                <th className="w-32 px-4 py-3 font-medium">
                  {COPY.criteria.columns.scale}
                </th>
                <th className="w-12 px-2 py-3" aria-label="row actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {criteria.map((c, i) => (
                <tr key={c.id} className="bg-white align-top">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={c.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                      placeholder={COPY.criteria.placeholders.title}
                      className="w-full rounded-xl border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-[var(--color-foreground)] hover:border-[var(--color-border)] focus:border-[var(--color-foreground)] focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      value={c.description}
                      onChange={(e) => update(i, { description: e.target.value })}
                      placeholder={COPY.criteria.placeholders.description}
                      rows={2}
                      className="w-full resize-y rounded-xl border border-transparent bg-transparent px-2 py-1.5 text-sm text-[var(--color-foreground-muted)] hover:border-[var(--color-border)] focus:border-[var(--color-foreground)] focus:bg-white focus:text-[var(--color-foreground)] focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={Number.isFinite(c.weight) ? c.weight : 0}
                        onChange={(e) =>
                          update(i, { weight: Number(e.target.value) || 0 })
                        }
                        className="h-9 w-20 rounded-xl border border-[var(--color-border)] bg-white px-2 text-sm focus:border-[var(--color-foreground)] focus:outline-none"
                      />
                      <Badge tone="neutral">
                        {Math.round((c.weight || 0) * 100)}%
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.scale.kind}
                      onChange={(e) =>
                        setScale(i, e.target.value as ScoreScaleKind)
                      }
                      className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-2 text-sm focus:border-[var(--color-foreground)] focus:outline-none"
                    >
                      {SCALE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]"
                      aria-label={`${COPY.criteria.removeRow} ${c.title || c.id}`}
                    >
                      {COPY.criteria.removeRow}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={add}>
            + {COPY.criteria.addRow}
          </Button>
          <span className="text-xs text-[var(--color-foreground-muted)]">
            {COPY.criteria.weightsHint} · current sum:{" "}
            {Math.round(totalWeight * 100)}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
        <Button variant="ghost" size="md" onClick={onBack}>
          ← {COPY.criteria.back}
        </Button>
        <Button
          size="lg"
          onClick={onStart}
          disabled={
            criteria.length === 0 ||
            criteria.some((c) => !c.title.trim())
          }
        >
          {COPY.criteria.startReview} →
        </Button>
      </div>
    </div>
  );
}
