"use client";

import { useState } from "react";
import { ACCEPTED_FILES } from "@/config/global";
import { COPY } from "@/constants/copy";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FileDrop } from "@/components/ui/FileDrop";
import type { IntakeData } from "@/types";

interface IntakeFormProps {
  initial: IntakeData;
  loading?: boolean;
  onSubmit: (data: IntakeData) => void;
}

export function IntakeForm({ initial, loading = false, onSubmit }: IntakeFormProps) {
  const [data, setData] = useState<IntakeData>(initial);

  const canSubmit =
    data.repoUrl.trim().length > 0 || data.productUrl.trim().length > 0;

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

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading} disabled={!canSubmit} size="lg">
          {loading ? COPY.intake.submitLoading : COPY.intake.submit} →
        </Button>
      </div>
    </form>
  );
}
