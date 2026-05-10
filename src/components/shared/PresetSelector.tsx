"use client";

import { COPY } from "@/constants/copy";
import { cn } from "@/lib/cn";
import type { HackathonPreset } from "@/types";

export const CUSTOM_PRESET_VALUE = "__custom__";

interface PresetSelectorProps {
  presets: HackathonPreset[];
  loading: boolean;
  value: string;
  onChange: (slug: string) => void;
}

export function PresetSelector({
  presets,
  loading,
  value,
  onChange,
}: PresetSelectorProps) {
  const options = [
    {
      slug: CUSTOM_PRESET_VALUE,
      name: COPY.presets.customLabel,
      description: COPY.presets.customDescription,
      tagline: undefined as string | undefined,
    },
    ...presets.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      tagline: p.isDefault ? "Default" : undefined,
    })),
  ];

  return (
    <fieldset className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-[var(--color-foreground)]">
          {COPY.presets.label}
        </span>
        <span className="text-xs text-[var(--color-foreground-muted)]">
          {loading ? COPY.presets.loading : COPY.presets.description}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = opt.slug === value;
          return (
            <button
              key={opt.slug}
              type="button"
              onClick={() => onChange(opt.slug)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-colors",
                selected
                  ? "border-[var(--color-foreground)] bg-[var(--color-surface-muted)]"
                  : "border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-muted)]/60",
              )}
            >
              <div className="flex w-full items-center gap-2">
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
                <span className="flex-1 text-sm font-medium text-[var(--color-foreground)]">
                  {opt.name}
                </span>
                {opt.tagline ? (
                  <span className="rounded-full border border-[var(--color-border)] bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
                    {opt.tagline}
                  </span>
                ) : null}
              </div>
              {opt.description ? (
                <span className="text-xs leading-relaxed text-[var(--color-foreground-muted)]">
                  {opt.description}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {!loading && presets.length === 0 ? (
        <span className="text-xs text-[var(--color-foreground-muted)]">
          {COPY.presets.empty}
        </span>
      ) : null}
    </fieldset>
  );
}
