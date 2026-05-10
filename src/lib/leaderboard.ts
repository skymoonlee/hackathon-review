"use client";

import { getInsforge } from "@/lib/insforge-client";
import type { Criterion } from "@/types";

interface SubmissionRow {
  id: string;
  track_id: string | null;
  repo_url: string | null;
  product_url: string | null;
  criteria: Criterion[] | null;
  created_at: string;
}

interface ReviewRow {
  submission_id: string;
  weighted_total: number | string;
  normalized: number | string;
  created_at: string;
}

export interface LeaderboardEntry {
  submissionId: string;
  trackId: string | null;
  repoUrl: string | null;
  productUrl: string | null;
  reviewCount: number;
  avgWeighted: number;
  avgNormalized: number;
  bestNormalized: number;
  latestReviewAt: string | null;
}

export interface LeaderboardGroup {
  trackId: string | null;
  entries: LeaderboardEntry[];
}

function toNumber(v: number | string): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

export async function fetchLeaderboard(): Promise<{
  groups: LeaderboardGroup[];
  total: number;
}> {
  const insforge = getInsforge();

  const [submissionsRes, reviewsRes] = await Promise.all([
    insforge.database
      .from("submissions")
      .select("id, track_id, repo_url, product_url, criteria, created_at"),
    insforge.database
      .from("reviews")
      .select("submission_id, weighted_total, normalized, created_at"),
  ]);

  if (submissionsRes.error) throw new Error(submissionsRes.error.message);
  if (reviewsRes.error) throw new Error(reviewsRes.error.message);

  const submissions = (submissionsRes.data ?? []) as SubmissionRow[];
  const reviews = (reviewsRes.data ?? []) as ReviewRow[];

  const reviewsBySubmission = new Map<string, ReviewRow[]>();
  for (const r of reviews) {
    const list = reviewsBySubmission.get(r.submission_id) ?? [];
    list.push(r);
    reviewsBySubmission.set(r.submission_id, list);
  }

  const entries: LeaderboardEntry[] = [];
  for (const s of submissions) {
    const rs = reviewsBySubmission.get(s.id) ?? [];
    if (rs.length === 0) continue;
    const weights = rs.map((r) => toNumber(r.weighted_total));
    const norms = rs.map((r) => toNumber(r.normalized));
    const avgWeighted = weights.reduce((a, b) => a + b, 0) / rs.length;
    const avgNormalized = norms.reduce((a, b) => a + b, 0) / rs.length;
    const bestNormalized = norms.reduce((a, b) => Math.max(a, b), 0);
    const latestReviewAt = rs
      .map((r) => r.created_at)
      .sort()
      .at(-1) ?? null;

    entries.push({
      submissionId: s.id,
      trackId: s.track_id,
      repoUrl: s.repo_url,
      productUrl: s.product_url,
      reviewCount: rs.length,
      avgWeighted,
      avgNormalized,
      bestNormalized,
      latestReviewAt,
    });
  }

  const grouped = new Map<string | null, LeaderboardEntry[]>();
  for (const e of entries) {
    const key = e.trackId;
    const list = grouped.get(key) ?? [];
    list.push(e);
    grouped.set(key, list);
  }

  const groups: LeaderboardGroup[] = [];
  for (const [trackId, list] of grouped.entries()) {
    list.sort((a, b) => b.avgNormalized - a.avgNormalized);
    groups.push({ trackId, entries: list });
  }

  groups.sort((a, b) => {
    const aScore = a.entries[0]?.avgNormalized ?? 0;
    const bScore = b.entries[0]?.avgNormalized ?? 0;
    return bScore - aScore;
  });

  return { groups, total: entries.length };
}
