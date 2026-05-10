"use client";

import { useEffect, useMemo, useState } from "react";
import { COPY } from "@/constants/copy";
import { SCORE_BAND_LABELS } from "@/config/criteria";
import { getTrack, HACKATHON_TRACKS } from "@/config/tracks";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { fetchLeaderboard, type LeaderboardGroup } from "@/lib/leaderboard";
import { useAuth } from "@/components/shared/AuthProvider";

type Status = "idle" | "loading" | "ready" | "failed" | "guest";

function bandFor(ratio: number) {
  return (
    SCORE_BAND_LABELS.find((b) => ratio >= b.threshold) ??
    SCORE_BAND_LABELS[SCORE_BAND_LABELS.length - 1]!
  );
}

function trackDisplay(trackId: string | null) {
  if (!trackId) return { name: COPY.leaderboard.untitledTrack, tagline: "" };
  const known = HACKATHON_TRACKS.find((t) => t.id === trackId);
  if (known) return { name: known.name, tagline: known.tagline };
  return { name: trackId, tagline: "" };
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

export function LeaderboardView() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [groups, setGroups] = useState<LeaderboardGroup[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus("guest");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetchLeaderboard()
      .then((res) => {
        if (cancelled) return;
        setGroups(res.groups);
        setTotal(res.total);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("[leaderboard] fetch failed:", err);
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const headerSubtitle = useMemo(() => {
    if (status === "ready") return COPY.leaderboard.subtitle;
    if (status === "loading") return COPY.leaderboard.loading;
    if (status === "failed") return COPY.leaderboard.failed;
    if (status === "guest") return COPY.leaderboard.guest;
    return COPY.leaderboard.subtitle;
  }, [status]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
          {COPY.leaderboard.eyebrow}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
          {COPY.leaderboard.title}
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--color-foreground-muted)]">
          {headerSubtitle}
        </p>
      </div>

      {status === "ready" && total === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="text-base font-medium text-[var(--color-foreground)]">
                {COPY.leaderboard.emptyTitle}
              </span>
              <span className="max-w-md text-sm text-[var(--color-foreground-muted)]">
                {COPY.leaderboard.emptyBody}
              </span>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {status === "ready" && total > 0
        ? groups.map((group) => {
            const { name, tagline } = trackDisplay(group.trackId);
            return (
              <Card key={group.trackId ?? "_untitled"}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
                      {tagline ? (
                        <p className="mt-0.5 text-sm text-[var(--color-foreground-muted)]">
                          {tagline}
                        </p>
                      ) : null}
                    </div>
                    <Badge tone="neutral">
                      {COPY.leaderboard.reviewsCount(group.entries.length)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--color-surface-muted)] text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                        <tr>
                          <th className="w-10 px-4 py-3 font-medium">
                            {COPY.leaderboard.columns.rank}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {COPY.leaderboard.columns.project}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {COPY.leaderboard.columns.links}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {COPY.leaderboard.columns.reviews}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {COPY.leaderboard.columns.score}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {group.entries.map((entry, i) => {
                          const band = bandFor(entry.avgNormalized);
                          const trackInfo = entry.trackId
                            ? getTrack(entry.trackId)
                            : null;
                          const projectName =
                            shortUrl(entry.repoUrl) ||
                            shortUrl(entry.productUrl) ||
                            entry.submissionId.slice(0, 8);
                          return (
                            <tr key={entry.submissionId} className="bg-white align-top">
                              <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                                {i + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="font-medium text-[var(--color-foreground)]">
                                    {projectName}
                                  </span>
                                  {trackInfo ? (
                                    <span className="text-xs text-[var(--color-foreground-muted)]">
                                      {trackInfo.tagline}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  {entry.repoUrl ? (
                                    <a
                                      href={entry.repoUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]"
                                    >
                                      {COPY.leaderboard.repoLink}
                                    </a>
                                  ) : null}
                                  {entry.productUrl ? (
                                    <a
                                      href={entry.productUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]"
                                    >
                                      {COPY.leaderboard.productLink}
                                    </a>
                                  ) : null}
                                  {!entry.repoUrl && !entry.productUrl ? (
                                    <span className="text-xs text-[var(--color-foreground-muted)]">
                                      {COPY.leaderboard.noLink}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                                {entry.reviewCount}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Badge tone={band.tone as BadgeTone}>
                                    {Math.round(entry.avgNormalized * 100)}%
                                  </Badge>
                                  <span className="text-xs text-[var(--color-foreground-muted)]">
                                    {entry.avgWeighted.toFixed(2)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            );
          })
        : null}
    </div>
  );
}
