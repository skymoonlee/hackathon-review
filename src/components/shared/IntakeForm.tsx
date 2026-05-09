"use client";

import { useState } from "react";
import { ACCEPTED_FILES } from "@/config/global";
import { COPY } from "@/constants/copy";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FileDrop } from "@/components/ui/FileDrop";
import type { IntakeData } from "@/types";

interface IntakeFormProps {
  initial: IntakeData;
  loading?: boolean;
  parsing?: boolean;
  onSubmit: (data: IntakeData) => void;
  onParse?: (data: IntakeData) => void;
}

export function IntakeForm({
  initial,
  loading = false,
  parsing = false,
  onSubmit,
  onParse,
}: IntakeFormProps) {
  const [data, setData] = useState<IntakeData>(initial);

  const canSubmit =
    data.repoUrl.trim().length > 0 || data.productUrl.trim().length > 0;

  const canParse =
    data.criteriaText.trim().length > 0 ||
    data.criteriaImage !== null ||
    data.conceptPdf !== null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
      }}
      className="flex flex-col gap-5"
    >
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
        <FileDrop
          label={ACCEPTED_FILES.conceptPdf.label}
          accept={ACCEPTED_FILES.conceptPdf.accept}
          helpText={ACCEPTED_FILES.conceptPdf.helpText}
          value={data.conceptPdf}
          onChange={(file) => setData({ ...data, conceptPdf: file })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
        {onParse ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            loading={parsing}
            disabled={!canParse || parsing || loading}
            onClick={() => onParse(data)}
          >
            {parsing ? COPY.intake.parsing : COPY.intake.parseAttachments}
          </Button>
        ) : <span />}

        <Button type="submit" loading={loading} disabled={!canSubmit || loading} size="lg">
          {loading ? COPY.intake.submitLoading : COPY.intake.submit} →
        </Button>
      </div>
      {onParse ? (
        <p className="-mt-2 text-xs text-[var(--color-foreground-muted)]">
          {COPY.intake.parseHint}
        </p>
      ) : null}
    </form>
  );
}
