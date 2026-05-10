"use client";

import { getInsforge } from "@/lib/insforge-client";
import type { Criterion, IntakeData, ReviewScore } from "@/types";

export interface SavedSubmission {
  id: string;
  created_by: string | null;
}

export async function saveSubmission(params: {
  intake: IntakeData;
  criteria: Criterion[];
  userId: string;
}): Promise<SavedSubmission | null> {
  const insforge = getInsforge();
  const conceptPdf = params.intake.conceptPdf;
  const criteriaImage = params.intake.criteriaImage;
  const { data, error } = await insforge.database
    .from("submissions")
    .insert([
      {
        track_id: params.intake.trackId || null,
        repo_url: params.intake.repoUrl || null,
        product_url: params.intake.productUrl || null,
        criteria_text: params.intake.criteriaText || null,
        criteria_image_name: criteriaImage?.name ?? null,
        criteria_image_url: criteriaImage?.url ?? null,
        criteria_image_key: criteriaImage?.key ?? null,
        criteria_image_bucket: criteriaImage?.bucket ?? null,
        concept_pdf_name: conceptPdf?.name ?? null,
        concept_pdf_url: conceptPdf?.url ?? null,
        concept_pdf_key: conceptPdf?.key ?? null,
        concept_pdf_bucket: conceptPdf?.bucket ?? null,
        criteria: params.criteria,
        created_by: params.userId,
      },
    ])
    .select("id, created_by")
    .single();

  if (error) {
    console.error("[saveSubmission] failed:", error.message);
    return null;
  }
  return data as SavedSubmission;
}

export async function saveReview(params: {
  submissionId: string;
  judgeId: string;
  scores: Record<string, ReviewScore>;
  weightedTotal: number;
  normalized: number;
}): Promise<boolean> {
  const insforge = getInsforge();
  const { error } = await insforge.database.from("reviews").insert([
    {
      submission_id: params.submissionId,
      judge_id: params.judgeId,
      scores: params.scores,
      weighted_total: params.weightedTotal,
      normalized: params.normalized,
    },
  ]);
  if (error) {
    console.error("[saveReview] failed:", error.message);
    return false;
  }
  return true;
}
