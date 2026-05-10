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
  fetchSubmissions,
  type SubmissionListItem,
} from "@/lib/submissions";

type Status = "idle" | "loading" | "ready" | "failed" | "guest";

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
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function SubmissionsList() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [items, setItems] = useState<SubmissionListItem[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus("guest");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetchSubmissions()
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("[submissions] fetch failed:", err);
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const subtitle = useMemo(() => {
    if (status === "loading") return COPY.submissions.loading;
    if (status === "failed") return COPY.submissions.failed;
    if (status === "guest") return COPY.submissions.guest;
    return COPY.submissions.subtitle;
  }, [status]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
            {COPY.submissions.eyebrow}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
            {COPY.submissions.title}
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--color-foreground-muted)]">
            {subtitle}
          </p>
        </div>
        <Link href={ROUTES.home}>
          <Button variant="secondary" size="sm">
            {COPY.submissions.register}
          </Button>
        </Link>
      </div>

      {status === "ready" && items.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-base font-medium text-[var(--color-foreground)]">
                {COPY.submissions.emptyTitle}
              </span>
              <span className="max-w-md text-sm text-[var(--color-foreground-muted)]">
                {COPY.submissions.emptyBody}
              </span>
              <Link href={ROUTES.home}>
                <Button variant="primary" size="sm">
                  {COPY.submissions.register}
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {status === "ready" && items.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                {items.length} project{items.length === 1 ? "" : "s"}
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--color-surface-muted)] text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {COPY.submissions.columns.project}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {COPY.submissions.columns.track}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {COPY.submissions.columns.criteria}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {COPY.submissions.columns.reviews}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {COPY.submissions.columns.score}
                    </th>
                    <th
                      className="w-24 px-4 py-3 font-medium"
                      aria-label={COPY.submissions.open}
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((item) => {
                    const projectName =
                      shortUrl(item.repoUrl) ||
                      shortUrl(item.productUrl) ||
                      item.id.slice(0, 8);
                    const band =
                      item.avgNormalized != null
                        ? bandFor(item.avgNormalized)
                        : null;
                    return (
                      <tr
                        key={item.id}
                        className="bg-white align-top hover:bg-[var(--color-surface-muted)]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={ROUTES.submissionDetail(item.id)}
                            className="flex flex-col"
                          >
                            <span className="font-medium text-[var(--color-foreground)] underline-offset-2 hover:underline">
                              {projectName}
                            </span>
                            <span className="text-xs text-[var(--color-foreground-muted)]">
                              Registered {formatDate(item.createdAt)}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone="neutral">{trackName(item.trackId)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                          {item.criteriaCount}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                          {item.reviewCount}
                        </td>
                        <td className="px-4 py-3">
                          {band && item.avgNormalized != null ? (
                            <Badge tone={band.tone as BadgeTone}>
                              {Math.round(item.avgNormalized * 100)}%
                            </Badge>
                          ) : (
                            <span className="text-xs text-[var(--color-foreground-muted)]">
                              {COPY.submissions.pending}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={ROUTES.submissionDetail(item.id)}
                            className="text-sm font-medium text-[var(--color-foreground)] hover:underline"
                          >
                            {COPY.submissions.open}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
