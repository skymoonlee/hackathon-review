"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COPY } from "@/constants/copy";
import { ROUTES, REVIEW_FLOW_STEPS } from "@/config/global";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stepper } from "@/components/shared/Stepper";
import { ReviewStep } from "@/components/shared/ReviewStep";
import { SummaryView } from "@/components/shared/SummaryView";
import { useAuth } from "@/components/shared/AuthProvider";
import { resolveTrackContext } from "@/lib/track-context";
import { saveReview } from "@/lib/persistence";
import {
  fetchSubmission,
  type SubmissionDetail,
} from "@/lib/submissions";
import type {
  IntakeData,
  IntakeFile,
  JudgeChatMessage,
  JudgeVerdict,
  RepoContext,
  ReviewScore,
} from "@/types";

type Status = "idle" | "loading" | "ready" | "missing" | "guest" | "failed";
type PersistStatus = "idle" | "saving" | "saved" | "failed" | "duplicate";
interface PersistState {
  status: PersistStatus;
  error?: string;
}
type Step = "review" | "summary";

interface SubmissionReviewViewProps {
  submissionId: string;
}

function buildIntake(detail: SubmissionDetail): IntakeData {
  const conceptPdf: IntakeFile | null = detail.conceptPdf
    ? {
        name: detail.conceptPdf.name,
        size: 0,
        type: "application/pdf",
        url: detail.conceptPdf.url ?? undefined,
      }
    : null;
  const criteriaImage: IntakeFile | null = detail.criteriaImage
    ? {
        name: detail.criteriaImage.name,
        size: 0,
        type: "image/*",
        url: detail.criteriaImage.url ?? undefined,
      }
    : null;
  return {
    trackId: detail.trackId ?? "",
    repoUrl: detail.repoUrl ?? "",
    productUrl: detail.productUrl ?? "",
    criteriaText: detail.criteriaText ?? "",
    criteriaImage,
    conceptPdf,
  };
}

export function SubmissionReviewView({ submissionId }: SubmissionReviewViewProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [step, setStep] = useState<Step>("review");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, ReviewScore>>({});
  const [verdicts, setVerdicts] = useState<Record<string, JudgeVerdict>>({});
  const [chatHistories, setChatHistories] = useState<
    Record<string, JudgeChatMessage[]>
  >({});
  const [repoContext, setRepoContext] = useState<RepoContext | null>(null);
  const [persisted, setPersisted] = useState<PersistState>({ status: "idle" });

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
        console.error("[submission-review] fetch failed:", err);
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, submissionId, user]);

  useEffect(() => {
    if (!detail?.repoUrl) return;
    let cancelled = false;
    setRepoContext(null);
    fetch("/api/repo-context", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: detail.repoUrl }),
    })
      .then(async (res) => {
        if (!res.ok) {
          return {
            source: "fallback",
            reason: `http_${res.status}`,
            files: [],
          } as RepoContext;
        }
        return (await res.json()) as RepoContext;
      })
      .then((ctx) => {
        if (cancelled || !ctx) return;
        setRepoContext(ctx);
      })
      .catch((err) => {
        console.error("[repo-context] fetch failed:", err);
        if (!cancelled) {
          setRepoContext({
            source: "fallback",
            reason: "fetch_failed",
            files: [],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [detail?.repoUrl]);

  const intake = useMemo<IntakeData | null>(
    () => (detail ? buildIntake(detail) : null),
    [detail],
  );

  const trackContext = useMemo(
    () => resolveTrackContext(detail?.trackId ?? "", [], detail?.trackSnapshot),
    [detail?.trackId, detail?.trackSnapshot],
  );

  const summary = useMemo(() => {
    if (!detail) return { weightedTotal: 0, maxPossible: 0, normalized: 0 };
    let weighted = 0;
    let max = 0;
    for (const c of detail.criteria) {
      const s = scores[c.id]?.value ?? c.scale.min;
      weighted += s * c.weight;
      max += c.scale.max * c.weight;
    }
    return {
      weightedTotal: weighted,
      maxPossible: max,
      normalized: max > 0 ? weighted / max : 0,
    };
  }, [detail, scores]);

  function handleScoreChange(score: ReviewScore) {
    setScores((prev) => ({ ...prev, [score.criterionId]: score }));
  }
  function handleVerdictChange(v: JudgeVerdict) {
    setVerdicts((prev) => ({ ...prev, [v.criterionId]: v }));
  }
  function handleChatHistoryChange(
    criterionId: string,
    messages: JudgeChatMessage[],
  ) {
    setChatHistories((prev) => ({ ...prev, [criterionId]: messages }));
  }

  async function persistReview() {
    if (!user || !detail) {
      setPersisted({ status: "failed", error: "Not signed in" });
      return;
    }
    setPersisted({ status: "saving" });
    const result = await saveReview({
      submissionId: detail.id,
      judgeId: user.id,
      scores,
      weightedTotal: Number(summary.weightedTotal.toFixed(3)),
      normalized: Number(summary.normalized.toFixed(4)),
    });
    if (result.status === "saved") setPersisted({ status: "saved" });
    else if (result.status === "duplicate") setPersisted({ status: "duplicate" });
    else setPersisted({ status: "failed", error: result.message });
  }

  async function handleNext() {
    if (!detail) return;
    if (reviewIndex < detail.criteria.length - 1) {
      setReviewIndex((i) => i + 1);
    } else {
      setStep("summary");
      await persistReview();
    }
  }
  function handleBack() {
    if (reviewIndex > 0) setReviewIndex((i) => i - 1);
  }
  function goBackToSubmission() {
    router.push(ROUTES.submissionDetail(submissionId));
  }

  if (status === "loading" || status === "idle") {
    return <Stub>{COPY.submissionDetail.loading}</Stub>;
  }
  if (status === "guest") {
    return <Stub>{COPY.submissionDetail.guest}</Stub>;
  }
  if (status === "missing") {
    return (
      <Stub>
        {COPY.submissionDetail.notFound}{" "}
        <Link
          href={ROUTES.submissions}
          className="underline underline-offset-2"
        >
          {COPY.submissionDetail.backToList}
        </Link>
      </Stub>
    );
  }
  if (status === "failed" || !detail || !intake) {
    return <Stub>{COPY.submissions.failed}</Stub>;
  }

  if (detail.criteria.length === 0) {
    return <Stub>This submission has no criteria — nothing to score.</Stub>;
  }

  const current = detail.criteria[reviewIndex]!;

  const persistLabel: Record<PersistStatus, string> = {
    idle: "Not saved yet",
    saving: "Saving review…",
    saved: "Saved to InsForge",
    failed: "Save failed",
    duplicate: "You've already reviewed this submission",
  };
  const canRetry =
    persisted.status === "failed" || persisted.status === "idle";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={ROUTES.submissionDetail(submissionId)}
          className="text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:underline"
        >
          {COPY.submissionDetail.backToList}
        </Link>
        <Badge tone="neutral">{trackContext.name}</Badge>
      </div>

      <Stepper current={step} steps={REVIEW_FLOW_STEPS} />

      <Card>
        {step === "review" ? (
          <CardBody>
            <ReviewStep
              criterion={current}
              index={reviewIndex}
              total={detail.criteria.length}
              score={scores[current.id]}
              intake={intake}
              trackContext={trackContext}
              repoContext={repoContext}
              verdict={verdicts[current.id]}
              chatHistory={chatHistories[current.id]}
              onChange={handleScoreChange}
              onVerdictChange={handleVerdictChange}
              onChatHistoryChange={(msgs) =>
                handleChatHistoryChange(current.id, msgs)
              }
              onNext={handleNext}
              onBack={handleBack}
              isLast={reviewIndex === detail.criteria.length - 1}
            />
          </CardBody>
        ) : null}

        {step === "summary" ? (
          <>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {COPY.summary.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                    {COPY.summary.subtitle}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="whitespace-nowrap rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-xs text-[var(--color-foreground-muted)]">
                    {persistLabel[persisted.status]}
                  </span>
                  {persisted.status === "failed" && persisted.error ? (
                    <span className="max-w-xs text-right text-[11px] text-red-600">
                      {persisted.error}
                    </span>
                  ) : null}
                  {canRetry ? (
                    <button
                      type="button"
                      onClick={persistReview}
                      className="text-xs text-[var(--color-foreground-muted)] underline underline-offset-2 hover:text-[var(--color-foreground)]"
                    >
                      Retry save
                    </button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <SummaryView
                criteria={detail.criteria}
                scores={scores}
                onDone={goBackToSubmission}
                doneLabel={COPY.summary.backToSubmission}
              />
            </CardBody>
          </>
        ) : null}
      </Card>
    </div>
  );
}

function Stub({ children }: { children: React.ReactNode }) {
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
