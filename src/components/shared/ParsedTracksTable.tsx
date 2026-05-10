"use client";

import { COPY } from "@/constants/copy";
import { cn } from "@/lib/cn";
import type { ParsedTrack } from "@/types";

interface ParsedTracksTableProps {
  tracks: ParsedTrack[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ParsedTracksTable({
  tracks,
  selectedId,
  onSelect,
}: ParsedTracksTableProps) {
  if (tracks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] py-6 text-center text-xs text-[var(--color-foreground-muted)]">
        {COPY.tracks.parsedEmpty}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
          {COPY.tracks.parsedTitle}
        </span>
        <span className="text-xs text-[var(--color-foreground-muted)]">
          {COPY.tracks.parsedSubtitle}
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
            <tr>
              <th className="px-4 py-2 font-medium">
                {COPY.tracks.parsedColumns.name}
              </th>
              <th className="px-4 py-2 font-medium">
                {COPY.tracks.parsedColumns.description}
              </th>
              <th className="w-48 px-4 py-2 font-medium">
                {COPY.tracks.parsedColumns.emphasis}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {tracks.map((t) => {
              const selected = t.id === selectedId;
              return (
                <tr
                  key={t.id}
                  onClick={() => onSelect(t.id)}
                  className={cn(
                    "cursor-pointer align-top transition-colors",
                    selected
                      ? "bg-[var(--color-surface-muted)]"
                      : "bg-white hover:bg-[var(--color-surface-muted)]/60",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          "grid h-4 w-4 place-items-center rounded-full border",
                          selected
                            ? "border-[var(--color-foreground)] bg-[var(--color-foreground)]"
                            : "border-[var(--color-border-strong)] bg-white",
                        )}
                      >
                        {selected ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        ) : null}
                      </span>
                      <span className="text-sm font-medium text-[var(--color-foreground)]">
                        {t.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs leading-relaxed text-[var(--color-foreground-muted)]">
                    {t.description}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(t.emphasis ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
