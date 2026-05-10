"use client";

import { useEffect, useState } from "react";
import { ACCEPTED_FILES, STORAGE_BUCKETS } from "@/config/global";
import { COPY } from "@/constants/copy";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FileDrop } from "@/components/ui/FileDrop";
import { ParsedTracksTable } from "@/components/shared/ParsedTracksTable";
import { CriteriaPreviewTable } from "@/components/shared/CriteriaPreviewTable";
import {
  CUSTOM_PRESET_VALUE,
  PresetSelector,
} from "@/components/shared/PresetSelector";
import type { HackathonPreset, IntakeData, ParsedTrack } from "@/types";

interface IntakeFormProps {
  initial: IntakeData;
  loading?: boolean;
  parsing?: boolean;
  parsedTracks: ParsedTrack[];
  presets: HackathonPreset[];
  presetsLoading: boolean;
  selectedPresetSlug: string;
  onPresetChange: (slug: string) => void;
  onSubmit: (data: IntakeData) => void;
  onParseTracks: (data: IntakeData) => void;
}

export function IntakeForm({
  initial,
  loading = false,
  parsing = false,
  parsedTracks,
  presets,
  presetsLoading,
  selectedPresetSlug,
  onPresetChange,
  onSubmit,
  onParseTracks,
}: IntakeFormProps) {
  const [data, setData] = useState<IntakeData>(initial);

  // Auto-select the first parsed track when one becomes available (e.g. after a
  // preset is loaded) so the criteria preview table appears immediately.
  useEffect(() => {
    if (parsedTracks.length === 0) return;
    setData((prev) => {
      const stillValid = parsedTracks.some((t) => t.id === prev.trackId);
      if (stillValid) return prev;
      return { ...prev, trackId: parsedTracks[0].id };
    });
  }, [parsedTracks]);

  const hasParsedTracks = parsedTracks.length > 0;
  const canSubmit =
    (data.repoUrl.trim().length > 0 || data.productUrl.trim().length > 0) &&
    hasParsedTracks &&
    data.trackId.trim().length > 0;

  const isCustomPreset = selectedPresetSlug === CUSTOM_PRESET_VALUE;
  const activePreset = presets.find((p) => p.slug === selectedPresetSlug);
  const canParseTracks = data.conceptPdf !== null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
      }}
      className="flex flex-col gap-5"
    >
      <PresetSelector
        presets={presets}
        loading={presetsLoading}
        value={selectedPresetSlug}
        onChange={onPresetChange}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="repoUrl"
          label={COPY.intake.repoUrl.label}
          placeholder={COPY.intake.repoUrl.placeholder}
          value={data.repoUrl}
          onChange={(e) => setData({ ...data, repoUrl: e.target.value })}
          inputMode="url"
        />
        <Input
          name="productUrl"
          label={COPY.intake.productUrl.label}
          placeholder={COPY.intake.productUrl.placeholder}
          value={data.productUrl}
          onChange={(e) => setData({ ...data, productUrl: e.target.value })}
          inputMode="url"
        />
      </div>

      <label
        className="flex flex-col gap-1.5"
        htmlFor="trackId"
      >
        <span className="text-sm font-medium text-[var(--color-foreground)]">
          {COPY.tracks.dropdownLabel}
        </span>
        <select
          id="trackId"
          name="trackId"
          disabled={!hasParsedTracks}
          value={data.trackId}
          onChange={(e) => setData({ ...data, trackId: e.target.value })}
          className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] transition-colors focus:border-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/10 disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)] disabled:text-[var(--color-foreground-muted)]"
        >
          <option value="" disabled>
            {hasParsedTracks
              ? COPY.tracks.dropdownPlaceholder
              : COPY.tracks.dropdownLocked}
          </option>
          {parsedTracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {!hasParsedTracks ? (
          <span className="text-xs text-[var(--color-foreground-muted)]">
            {COPY.tracks.parseHint}
          </span>
        ) : null}
      </label>

      <Textarea
        name="criteriaText"
        label={COPY.intake.criteriaText.label}
        placeholder={COPY.intake.criteriaText.placeholder}
        value={data.criteriaText}
        rows={4}
        onChange={(e) => setData({ ...data, criteriaText: e.target.value })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FileDrop
          label={ACCEPTED_FILES.criteriaImage.label}
          accept={ACCEPTED_FILES.criteriaImage.accept}
          helpText={ACCEPTED_FILES.criteriaImage.helpText}
          value={data.criteriaImage}
          onChange={(file) => setData({ ...data, criteriaImage: file })}
        />
        {isCustomPreset ? (
          <FileDrop
            label={ACCEPTED_FILES.conceptPdf.label}
            accept={ACCEPTED_FILES.conceptPdf.accept}
            helpText={ACCEPTED_FILES.conceptPdf.helpText}
            value={data.conceptPdf}
            onChange={(file) => setData({ ...data, conceptPdf: file })}
            bucket={STORAGE_BUCKETS.conceptPdfs}
          />
        ) : null}
      </div>

      {isCustomPreset ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-4 py-3">
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {COPY.tracks.parseHint}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={parsing}
            disabled={!canParseTracks || parsing || loading}
            onClick={() => onParseTracks(data)}
          >
            {parsing ? COPY.tracks.parsing : COPY.tracks.parseButton}
          </Button>
        </div>
      ) : null}

      {hasParsedTracks ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-[var(--color-foreground-muted)]">
              {activePreset
                ? COPY.presets.sourcePreset(activePreset.name)
                : COPY.presets.sourcePdf}
            </span>
            <ParsedTracksTable
              tracks={parsedTracks}
              selectedId={data.trackId}
              onSelect={(id) => setData({ ...data, trackId: id })}
            />
          </div>
          {(() => {
            const selected = parsedTracks.find((t) => t.id === data.trackId);
            const previewCriteria = selected?.criteria ?? [];
            if (previewCriteria.length === 0) return null;
            return (
              <CriteriaPreviewTable
                subtitle={`${selected?.name ?? ""} — pre-loaded rubric and weights from this hackathon's official guide.`}
                criteria={previewCriteria}
              />
            );
          })()}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4">
        <Button
          type="submit"
          loading={loading}
          disabled={!canSubmit || loading}
          size="lg"
        >
          {loading ? COPY.intake.submitLoading : COPY.intake.submit} →
        </Button>
      </div>
    </form>
  );
}
