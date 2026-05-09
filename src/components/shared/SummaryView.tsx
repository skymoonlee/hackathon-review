"use client";

import { useMemo } from "react";
import { SCORE_BAND_LABELS } from "@/config/criteria";
import { COPY } from "@/constants/copy";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Criterion, ReviewScore } from "@/types";

interface SummaryViewProps {
  criteria: Criterion[];
  scores: Record<string, ReviewScore>;
  onRestart: () => void;
}

function bandFor(ratio: number) {
  return (
    SCORE_BAND_LABELS.find((b) => ratio >= b.threshold) ??
    SCORE_BAND_LABELS[SCORE_BAND_LABELS.length - 1]!
  );
}

export function SummaryView({ criteria, scores, onRestart }: SummaryViewProps) {
  const { weightedTotal, maxPossible, normalized } = useMemo(() => {
    let weighted = 0;
    let max = 0;
    for (const c of criteria) {
      const s = scores[c.id]?.value ?? c.scale.min;
      weighted += s * c.weight;
      max += c.scale.max * c.weight;
    }
    return {
      weightedTotal: weighted,
      maxPossible: max,
      normalized: max > 0 ? weighted / max : 0,
    };
  }, [criteria, scores]);

  const overall = bandFor(normalized);

  function downloadJson() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            criteria,
            scores,
            weightedTotal,
            maxPossible,
            normalized,
            generatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `review-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
            {COPY.summary.totalLabel}
          </span>
          <span className="text-3xl font-semibold tracking-tight">
            {weightedTotal.toFixed(2)}{" "}
            <span className="text-lg text-[var(--color-foreground-muted)]">
              / {maxPossible.toFixed(2)}
            </span>
          </span>
        </div>
        <Badge tone={overall.tone as BadgeTone} className="text-sm">
          {overall.label} · {Math.round(normalized * 100)}%
        </Badge>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Criterion</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Weighted</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {criteria.map((c) => {
              const s = scores[c.id];
              const value = s?.value ?? c.scale.min;
              const ratio = value / c.scale.max;
              const band = bandFor(ratio);
              return (
                <tr key={c.id} className="bg-white align-top">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-[var(--color-foreground)]">
                        {c.title}
                      </span>
                      <span className="text-xs text-[var(--color-foreground-muted)]">
                        Weight {Math.round(c.weight * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={band.tone as BadgeTone}>
                      {value} / {c.scale.max}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                    {(value * c.weight).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                    {s?.notes?.trim() ? s.notes : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onRestart}>
          {COPY.summary.restart}
        </Button>
        <Button variant="secondary" onClick={downloadJson}>
          {COPY.summary.download}
        </Button>
      </div>
    </div>
  );
}
