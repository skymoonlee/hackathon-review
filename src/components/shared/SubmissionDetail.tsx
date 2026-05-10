"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { COPY } from "@/constants/copy";
import { ROUTES } from "@/config/global";
import { SCORE_BAND_LABELS } from "@/config/criteria";
import { HACKATHON_TRACKS } from "@/config/tracks";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/components/shared/AuthProvider";
import {
  fetchSubmission,
  type SubmissionDetail as SubmissionDetailData,
} from "@/lib/submissions";

type Status = "idle" | "loading" | "ready" | "failed" | "guest" | "missing";

function bandFor(ratio: number) {
  return (
    SCORE_BAND_LABELS.find((b) => ratio >= b.threshold) ??
    SCORE_BAND_LABELS[SCORE_BAND_LABELS.length - 1]!
  );
}

function trackName(trackId: string | null): string {
  if (!trackId) return COPY.leaderboard.untitledTrack;
  const known = HACKATHON_TRACKS.find((t) => t.id === trackId);
  return known?.name ?? trackId;
}

function shortUrl(raw: string | null): string {
  if (!raw) return "";
  try {
    const u = new URL(raw);
    return `${u.host}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return raw;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function maskJudgeId(id: string): string {
  return id.slice(0, 8);
}

interface SubmissionDetailViewProps {
  submissionId: string;
}

export function SubmissionDetailView({ submissionId }: SubmissionDetailViewProps) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState<SubmissionDetailData | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus("guest");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetchSubmission(submissionId)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setStatus("missing");
          return;
        }
        setDetail(row);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("[submission-detail] fetch failed:", err);
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, submissionId, user]);

  const avgNormalized = useMemo(() => {
    if (!detail || detail.reviews.length === 0) return null;
    const sum = detail.reviews.reduce((s, r) => s + r.normalized, 0);
    return sum / detail.reviews.length;
  }, [detail]);

  const alreadyReviewed = useMemo(() => {
    if (!detail || !user) return false;
    return detail.reviews.some((r) => r.judgeId === user.id);
  }, [detail, user]);

  if (status === "loading" || status === "idle") {
    return <StatusMessage>{COPY.submissionDetail.loading}</StatusMessage>;
  }
  if (status === "guest") {
    return <StatusMessage>{COPY.submissionDetail.guest}</StatusMessage>;
  }
  if (status === "missing") {
    return (
      <StatusMessage>
        {COPY.submissionDetail.notFound}{" "}
        <Link
          href={ROUTES.submissions}
          className="underline underline-offset-2"
        >
          {COPY.submissionDetail.backToList}
        </Link>
      </StatusMessage>
    );
  }
  if (status === "failed" || !detail) {
    return <StatusMessage>{COPY.submissions.failed}</StatusMessage>;
  }

  const projectName =
    shortUrl(detail.repoUrl) ||
    shortUrl(detail.productUrl) ||
    detail.id.slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={ROUTES.submissions}
          className="text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:underline"
        >
          {COPY.submissionDetail.backToList}
        </Link>
        <Badge tone="neutral">{trackName(detail.trackId)}</Badge>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
          {COPY.submissionDetail.eyebrow}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
          {projectName}
        </h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Registered {formatDate(detail.createdAt)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold tracking-tight">Project links</h2>
        </CardHeader>
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            <LinkField
              label={COPY.submissionDetail.repoLabel}
              href={detail.repoUrl}
            />
            <LinkField
              label={COPY.submissionDetail.productLabel}
              href={detail.productUrl}
            />
            <LinkField
              label={COPY.submissionDetail.pdfLabel}
              href={detail.conceptPdf?.url ?? null}
              fallbackText={detail.conceptPdf?.name}
            />
            <LinkField
              label={COPY.submissionDetail.imageLabel}
              href={detail.criteriaImage?.url ?? null}
              fallbackText={detail.criteriaImage?.name}
            />
          </dl>

          {detail.criteriaText ? (
            <div className="mt-6 flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                {COPY.submissionDetail.notesLabel}
              </span>
              <p className="whitespace-pre-wrap rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-foreground)]">
                {detail.criteriaText}
              </p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {COPY.submissionDetail.rubricTitle}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                {COPY.submissionDetail.rubricSubtitle}
              </p>
            </div>
            <Badge tone="neutral">{detail.criteria.length} criteria</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-muted)] text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    {COPY.criteria.columns.criterion}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {COPY.criteria.columns.description}
                  </th>
                  <th className="w-24 px-4 py-3 font-medium">
                    {COPY.criteria.columns.weight}
                  </th>
                  <th className="w-24 px-4 py-3 font-medium">
                    {COPY.criteria.columns.scale}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {detail.criteria.map((c) => (
                  <tr key={c.id} className="bg-white align-top">
                    <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">
                      {c.title}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                      {c.description}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">
                        {Math.round((c.weight || 0) * 100)}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                      {c.scale.min}–{c.scale.max}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {COPY.submissionDetail.reviewsTitle}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                {COPY.submissions.reviewsCount(detail.reviews.length)}
              </p>
            </div>
            {avgNormalized != null ? (
              <Badge tone={bandFor(avgNormalized).tone as BadgeTone}>
                Avg {Math.round(avgNormalized * 100)}%
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardBody>
          {detail.reviews.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-4 py-6 text-center text-sm text-[var(--color-foreground-muted)]">
              {COPY.submissionDetail.reviewsEmpty}
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--color-surface-muted)] text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {COPY.submissionDetail.judgeColumn}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {COPY.submissionDetail.scoreColumn}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {COPY.submissionDetail.submittedAtColumn}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {detail.reviews.map((r) => {
                    const band = bandFor(r.normalized);
                    const isYou = user && r.judgeId === user.id;
                    return (
                      <tr key={r.id} className="bg-white">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-[var(--color-foreground-muted)]">
                            {maskJudgeId(r.judgeId)}
                          </span>
                          {isYou ? (
                            <Badge tone="info" className="ml-2">
                              You
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge tone={band.tone as BadgeTone}>
                              {Math.round(r.normalized * 100)}%
                            </Badge>
                            <span className="text-xs text-[var(--color-foreground-muted)]">
                              {r.weightedTotal.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                          {formatDate(r.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {alreadyReviewed ? (
          <span className="text-sm text-[var(--color-foreground-muted)]">
            {COPY.submissionDetail.alreadyReviewed}
          </span>
        ) : (
          <Link href={ROUTES.submissionReview(detail.id)}>
            <Button size="lg">{COPY.submissionDetail.startReview}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function LinkField({
  label,
  href,
  fallbackText,
}: {
  label: string;
  href: string | null | undefined;
  fallbackText?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
        {label}
      </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sm font-medium text-[var(--color-foreground)] underline-offset-2 hover:underline"
        >
          {fallbackText ?? shortUrl(href) ?? href}
        </a>
      ) : fallbackText ? (
        <span className="text-sm text-[var(--color-foreground-muted)]">
          {fallbackText}
        </span>
      ) : (
        <span className="text-sm text-[var(--color-foreground-muted)]">—</span>
      )}
    </div>
  );
}

function StatusMessage({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardBody>
        <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
          {children}
        </div>
      </CardBody>
    </Card>
  );
}
