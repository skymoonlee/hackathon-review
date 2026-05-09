"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/shared/Header";
import { Stepper } from "@/components/shared/Stepper";
import { IntakeForm } from "@/components/shared/IntakeForm";
import { TrackSelector } from "@/components/shared/TrackSelector";
import { CriteriaTable } from "@/components/shared/CriteriaTable";
import { ReviewStep } from "@/components/shared/ReviewStep";
import { SummaryView } from "@/components/shared/SummaryView";
import { useAuth } from "@/components/shared/AuthProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { COPY } from "@/constants/copy";
import { type FlowStepKey } from "@/config/global";
import {
  DEFAULT_TRACK_ID,
  getTrack,
  type HackathonTrackId,
} from "@/config/tracks";
import { generateCriteria } from "@/lib/mock-ai";
import { saveReview, saveSubmission } from "@/lib/persistence";
import type { Criterion, IntakeData, ReviewScore } from "@/types";

const EMPTY_INTAKE: IntakeData = {
  trackId: DEFAULT_TRACK_ID,
  repoUrl: "",
  productUrl: "",
  criteriaText: "",
  criteriaImage: null,
  conceptPdf: null,
};

type PersistState = "idle" | "saving" | "saved" | "failed" | "guest";

function normalizeWeights(criteria: Criterion[]): Criterion[] {
  const total = criteria.reduce((s, c) => s + (c.weight > 0 ? c.weight : 0), 0);
  if (total <= 0) {
    const even = 1 / Math.max(criteria.length, 1);
    return criteria.map((c) => ({ ...c, weight: even }));
  }
  return criteria.map((c) => ({
    ...c,
    weight: (c.weight > 0 ? c.weight : 0) / total,
  }));
}

export default function HomePage() {
  const { user } = useAuth();
  const [step, setStep] = useState<FlowStepKey>("intake");
  const [intake, setIntake] = useState<IntakeData>(EMPTY_INTAKE);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Record<string, ReviewScore>>({});
  const [reviewIndex, setReviewIndex] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<PersistState>("idle");

  const selectedTrack = getTrack(intake.trackId);

  function handleTrackChange(trackId: HackathonTrackId) {
    setIntake((prev) => ({ ...prev, trackId }));
  }

  async function handleParseAttachments(data: IntakeData) {
    setIntake(data);
    setParsing(true);
    try {
      const generated = await generateCriteria(data);
      setCriteria(generated);
      setScores({});
      setReviewIndex(0);
      setStep("criteria");
    } finally {
      setParsing(false);
    }
  }

  function handleIntakeSubmit(data: IntakeData) {
    setIntake(data);
    if (criteria.length === 0) {
      // Seed from the selected track's template — instant, deterministic.
      // Use "Parse from attachments" if you want AI to refine instead.
      setCriteria([...getTrack(data.trackId).template]);
    }
    setStep("criteria");
  }

  async function handleSuggestFromAttachments() {
    setParsing(true);
    try {
      const generated = await generateCriteria(intake);
      setCriteria(generated);
      setScores({});
      setReviewIndex(0);
    } finally {
      setParsing(false);
    }
  }

  async function handleStartReview() {
    const finalCriteria = normalizeWeights(criteria);
    setCriteria(finalCriteria);
    setScores({});
    setReviewIndex(0);
    setSubmissionId(null);
    if (user) {
      const saved = await saveSubmission({
        intake,
        criteria: finalCriteria,
        userId: user.id,
      });
      setSubmissionId(saved?.id ?? null);
    }
    setStep("review");
  }

  function handleScoreChange(score: ReviewScore) {
    setScores((prev) => ({ ...prev, [score.criterionId]: score }));
  }

  const summary = useMemo(() => {
    let weighted = 0;
    let max = 0;
    for (const c of criteria) {
      const s = scores[c.id]?.value ?? c.scale.min;
      weighted += s * c.weight;
      max += c.scale.max * c.weight;
    }
    return {
      weightedTotal: weighted,
      maxPossible: max,
      normalized: max > 0 ? weighted / max : 0,
    };
  }, [criteria, scores]);

  async function persistReview() {
    if (!user) {
      setPersisted("guest");
      return;
    }
    if (!submissionId) {
      setPersisted("failed");
      return;
    }
    setPersisted("saving");
    const ok = await saveReview({
      submissionId,
      judgeId: user.id,
      scores,
      weightedTotal: Number(summary.weightedTotal.toFixed(3)),
      normalized: Number(summary.normalized.toFixed(4)),
    });
    setPersisted(ok ? "saved" : "failed");
  }

  async function handleNext() {
    if (reviewIndex < criteria.length - 1) {
      setReviewIndex((i) => i + 1);
    } else {
      setStep("summary");
      await persistReview();
    }
  }

  function handleBack() {
    if (reviewIndex > 0) setReviewIndex((i) => i - 1);
  }

  function handleRestart() {
    setIntake(EMPTY_INTAKE);
    setCriteria([]);
    setScores({});
    setReviewIndex(0);
    setSubmissionId(null);
    setPersisted("idle");
    setStep("intake");
  }

  const current = criteria[reviewIndex];
  const canSuggest =
    intake.criteriaText.trim().length > 0 ||
    intake.criteriaImage !== null ||
    intake.conceptPdf !== null;

  const persistLabel: Record<PersistState, string> = {
    idle: "Local only",
    saving: "Saving review…",
    saved: "Saved to InsForge",
    failed: "Save failed",
    guest: "Guest — not saved",
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="mb-8 flex flex-col gap-6">
          <Stepper current={step} />
          {step === "intake" ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
                {COPY.hero.eyebrow}
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
                {COPY.hero.title}
              </h1>
              <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--color-foreground-muted)]">
                {COPY.hero.subtitle}
              </p>
              {!user ? (
                <p className="mt-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-foreground-muted)]">
                  {COPY.guest.banner}
                </p>
              ) : null}
              <ol className="mt-6 grid gap-3 sm:grid-cols-3">
                {COPY.howItWorks.steps.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex flex-col gap-1 rounded-2xl border border-[var(--color-border)] bg-white p-4"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-foreground)] text-[10px] font-semibold text-white">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-foreground)]">
                      {s.title}
                    </span>
                    <span className="text-xs leading-relaxed text-[var(--color-foreground-muted)]">
                      {s.description}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>

        {step === "intake" ? (
          <div className="mb-6">
            <TrackSelector value={intake.trackId} onChange={handleTrackChange} />
          </div>
        ) : null}

        <Card>
          {step === "intake" ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      Project intake
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                      Track:{" "}
                      <span className="font-medium text-[var(--color-foreground)]">
                        {selectedTrack.name}
                      </span>{" "}
                      — {selectedTrack.tagline}
                    </p>
                  </div>
                  <Badge tone="info">{selectedTrack.tagline}</Badge>
                </div>
              </CardHeader>
              <CardBody>
                <IntakeForm
                  initial={intake}
                  loading={parsing}
                  parsing={parsing}
                  onSubmit={handleIntakeSubmit}
                  onParse={handleParseAttachments}
                />
              </CardBody>
            </>
          ) : null}

          {step === "criteria" ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {COPY.criteria.title}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                      {COPY.criteria.subtitle}
                    </p>
                  </div>
                  <Badge tone="neutral">{selectedTrack.name}</Badge>
                </div>
              </CardHeader>
              <CardBody>
                <CriteriaTable
                  criteria={criteria}
                  onChange={setCriteria}
                  onStart={handleStartReview}
                  onBack={() => setStep("intake")}
                  onSuggest={handleSuggestFromAttachments}
                  suggesting={parsing}
                  canSuggest={canSuggest}
                />
              </CardBody>
            </>
          ) : null}

          {step === "review" && current ? (
            <CardBody>
              <ReviewStep
                criterion={current}
                index={reviewIndex}
                total={criteria.length}
                score={scores[current.id]}
                onChange={handleScoreChange}
                onNext={handleNext}
                onBack={handleBack}
                isLast={reviewIndex === criteria.length - 1}
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
                  <span className="whitespace-nowrap rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-xs text-[var(--color-foreground-muted)]">
                    {persistLabel[persisted]}
                  </span>
                </div>
              </CardHeader>
              <CardBody>
                <SummaryView
                  criteria={criteria}
                  scores={scores}
                  onRestart={handleRestart}
                />
              </CardBody>
            </>
          ) : null}
        </Card>
      </main>
      <footer className="border-t border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-foreground-muted)]">
        Built for hackathon judging · powered by Next.js · InsForge · OpenAI · Nia
      </footer>
    </div>
  );
}
