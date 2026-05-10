"use client";

import type { Criterion } from "@/types";

interface CriteriaPreviewTableProps {
  title?: string;
  subtitle?: string;
  criteria: Criterion[];
}

const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function CriteriaPreviewTable({
  title = "Judging criteria",
  subtitle,
  criteria,
}: CriteriaPreviewTableProps) {
  if (criteria.length === 0) return null;

  const total = criteria.reduce(
    (sum, c) => sum + (Number.isFinite(c.weight) ? c.weight : 0),
    0,
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
          {title}
        </span>
        {subtitle ? (
          <span className="text-xs text-[var(--color-foreground-muted)]">
            {subtitle}
          </span>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
            <tr>
              <th className="px-4 py-2 font-medium">Criterion</th>
              <th className="px-4 py-2 font-medium">What we look for</th>
              <th className="w-20 px-4 py-2 text-right font-medium">Weight</th>
              <th className="w-20 px-4 py-2 text-right font-medium">Scale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {criteria.map((c) => (
              <tr key={c.id} className="align-top">
                <td className="px-4 py-3 text-sm font-medium text-[var(--color-foreground)]">
                  {c.title}
                </td>
                <td className="px-4 py-3 text-xs leading-relaxed text-[var(--color-foreground-muted)]">
                  {c.description}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums text-[var(--color-foreground)]">
                  {PERCENT_FORMATTER.format(c.weight)}
                </td>
                <td className="px-4 py-3 text-right text-xs text-[var(--color-foreground-muted)]">
                  {c.scale.min}–{c.scale.max}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[var(--color-surface-muted)] text-xs text-[var(--color-foreground-muted)]">
            <tr>
              <td className="px-4 py-2" colSpan={2}>
                Total weight
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {PERCENT_FORMATTER.format(total)}
              </td>
              <td className="px-4 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
