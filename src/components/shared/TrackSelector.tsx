"use client";

import { HACKATHON_TRACKS, type HackathonTrackId } from "@/config/tracks";
import { COPY } from "@/constants/copy";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

interface TrackSelectorProps {
  value: string;
  onChange: (trackId: HackathonTrackId) => void;
}

export function TrackSelector({ value, onChange }: TrackSelectorProps) {
  return (
    <section
      aria-labelledby="track-selector-title"
      className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="mb-4 flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
          {COPY.tracks.eyebrow}
        </span>
        <h2
          id="track-selector-title"
          className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]"
        >
          {COPY.tracks.title}
        </h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {COPY.tracks.subtitle}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label={COPY.tracks.title}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {HACKATHON_TRACKS.map((track) => {
          const selected = track.id === value;
          return (
            <button
              key={track.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(track.id)}
              className={cn(
                "group flex h-full flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition-colors",
                selected
                  ? "border-[var(--color-foreground)] bg-[var(--color-surface-muted)] ring-2 ring-[var(--color-foreground)]/10"
                  : "border-[var(--color-border)] bg-white hover:border-[var(--color-border-strong)]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    {track.name}
                  </span>
                  <span className="text-xs text-[var(--color-foreground-muted)]">
                    {track.tagline}
                  </span>
                </div>
                {selected ? (
                  <Badge tone="info" className="shrink-0">
                    Selected
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs leading-relaxed text-[var(--color-foreground-muted)]">
                {track.description}
              </p>
              <div className="mt-auto flex flex-wrap gap-1 pt-1">
                {track.emphasis.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
