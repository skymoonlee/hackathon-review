"use client";

import { getInsforge } from "@/lib/insforge-client";
import { DB_TABLES } from "@/config/global";
import type { Criterion, ParsedTrack } from "@/types";

interface SubmissionRow {
  id: string;
  track_id: string | null;
  repo_url: string | null;
  product_url: string | null;
  criteria_text: string | null;
  criteria: Criterion[] | null;
  criteria_image_name: string | null;
  criteria_image_url: string | null;
  concept_pdf_name: string | null;
  concept_pdf_url: string | null;
  track_snapshot: ParsedTrack | null;
  created_by: string | null;
  created_at: string;
}

interface ReviewRow {
  id: string;
  submission_id: string;
  judge_id: string;
  weighted_total: number | string;
  normalized: number | string;
  scores: Record<string, unknown> | null;
  created_at: string;
}

export interface SubmissionListItem {
  id: string;
  trackId: string | null;
  repoUrl: string | null;
  productUrl: string | null;
  criteriaCount: number;
  reviewCount: number;
  avgNormalized: number | null;
  createdAt: string;
}

export interface ReviewSummary {
  id: string;
  judgeId: string;
  weightedTotal: number;
  normalized: number;
  createdAt: string;
}

export interface SubmissionDetail {
  id: string;
  trackId: string | null;
  trackSnapshot: ParsedTrack | null;
  repoUrl: string | null;
  productUrl: string | null;
  criteriaText: string | null;
  criteria: Criterion[];
  conceptPdf: { name: string; url: string | null } | null;
  criteriaImage: { name: string; url: string | null } | null;
  createdBy: string | null;
  createdAt: string;
  reviews: ReviewSummary[];
}

const SUBMISSION_LIST_COLUMNS =
  "id, track_id, repo_url, product_url, criteria, created_at";

const SUBMISSION_DETAIL_COLUMNS =
  "id, track_id, repo_url, product_url, criteria_text, criteria, criteria_image_name, criteria_image_url, concept_pdf_name, concept_pdf_url, track_snapshot, created_by, created_at";

const REVIEW_SUMMARY_COLUMNS =
  "id, submission_id, judge_id, weighted_total, normalized, created_at";

function toNumber(v: number | string): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

export async function fetchSubmissions(): Promise<SubmissionListItem[]> {
  const insforge = getInsforge();
  const [submissionsRes, reviewsRes] = await Promise.all([
    insforge.database
      .from(DB_TABLES.submissions)
      .select(SUBMISSION_LIST_COLUMNS),
    insforge.database
      .from(DB_TABLES.reviews)
      .select("submission_id, normalized"),
  ]);

  if (submissionsRes.error) throw new Error(submissionsRes.error.message);
  if (reviewsRes.error) throw new Error(reviewsRes.error.message);

  const submissions = (submissionsRes.data ?? []) as SubmissionRow[];
  const reviews = (reviewsRes.data ?? []) as Pick<
    ReviewRow,
    "submission_id" | "normalized"
  >[];

  const reviewsBySubmission = new Map<
    string,
    { count: number; totalNormalized: number }
  >();
  for (const r of reviews) {
    const entry = reviewsBySubmission.get(r.submission_id) ?? {
      count: 0,
      totalNormalized: 0,
    };
    entry.count += 1;
    entry.totalNormalized += toNumber(r.normalized);
    reviewsBySubmission.set(r.submission_id, entry);
  }

  const items: SubmissionListItem[] = submissions.map((s) => {
    const r = reviewsBySubmission.get(s.id);
    return {
      id: s.id,
      trackId: s.track_id,
      repoUrl: s.repo_url,
      productUrl: s.product_url,
      criteriaCount: Array.isArray(s.criteria) ? s.criteria.length : 0,
      reviewCount: r?.count ?? 0,
      avgNormalized: r && r.count > 0 ? r.totalNormalized / r.count : null,
      createdAt: s.created_at,
    };
  });

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items;
}

export async function fetchSubmission(id: string): Promise<SubmissionDetail | null> {
  const insforge = getInsforge();
  const [subRes, reviewsRes] = await Promise.all([
    insforge.database
      .from(DB_TABLES.submissions)
      .select(SUBMISSION_DETAIL_COLUMNS)
      .eq("id", id)
      .single(),
    insforge.database
      .from(DB_TABLES.reviews)
      .select(REVIEW_SUMMARY_COLUMNS)
      .eq("submission_id", id),
  ]);

  if (subRes.error || !subRes.data) return null;
  if (reviewsRes.error) throw new Error(reviewsRes.error.message);

  const s = subRes.data as SubmissionRow;
  const reviewRows = (reviewsRes.data ?? []) as ReviewRow[];

  const reviews: ReviewSummary[] = reviewRows
    .map((r) => ({
      id: r.id,
      judgeId: r.judge_id,
      weightedTotal: toNumber(r.weighted_total),
      normalized: toNumber(r.normalized),
      createdAt: r.created_at,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return {
    id: s.id,
    trackId: s.track_id,
    trackSnapshot: s.track_snapshot ?? null,
    repoUrl: s.repo_url,
    productUrl: s.product_url,
    criteriaText: s.criteria_text,
    criteria: Array.isArray(s.criteria) ? s.criteria : [],
    conceptPdf: s.concept_pdf_name
      ? { name: s.concept_pdf_name, url: s.concept_pdf_url }
      : null,
    criteriaImage: s.criteria_image_name
      ? { name: s.criteria_image_name, url: s.criteria_image_url }
      : null,
    createdBy: s.created_by,
    createdAt: s.created_at,
    reviews,
  };
}

export async function fetchReviewByJudge(
  submissionId: string,
  judgeId: string,
): Promise<ReviewSummary | null> {
  const insforge = getInsforge();
  const { data, error } = await insforge.database
    .from(DB_TABLES.reviews)
    .select(REVIEW_SUMMARY_COLUMNS)
    .eq("submission_id", submissionId)
    .eq("judge_id", judgeId)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as ReviewRow;
  return {
    id: r.id,
    judgeId: r.judge_id,
    weightedTotal: toNumber(r.weighted_total),
    normalized: toNumber(r.normalized),
    createdAt: r.created_at,
  };
}
