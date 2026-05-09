"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/shared/Header";
import { Stepper } from "@/components/shared/Stepper";
import { IntakeForm } from "@/components/shared/IntakeForm";
import { CriteriaBuilder } from "@/components/shared/CriteriaBuilder";
import { ReviewStep } from "@/components/shared/ReviewStep";
import { SummaryView } from "@/components/shared/SummaryView";
import { useAuth } from "@/components/shared/AuthProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { COPY } from "@/constants/copy";
import { type FlowStepKey } from "@/config/global";
import { saveReview, saveSubmission } from "@/lib/persistence";
import type { Criterion, IntakeData, ReviewScore } from "@/types";

const EMPTY_INTAKE: IntakeData = {
  repoUrl: "",
  productUrl: "",
  criteriaText: "",
  criteriaImage: null,
  conceptPdf: null,
};

type PersistState = "idle" | "saving" | "saved" | "failed" | "guest";

export default function HomePage() {
  const { user } = useAuth();
  const [step, setStep] = useState<FlowStepKey>("intake");
  const [intake, setIntake] = useState<IntakeData>(EMPTY_INTAKE);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Record<string, ReviewScore>>({});
  const [reviewIndex, setReviewIndex] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<PersistState>("idle");

  function handleIntakeSubmit(data: IntakeData) {
    setIntake(data);
    setStep("criteria");
  }

  async function handleStartReview(builtCriteria: Criterion[]) {
    setCriteria(builtCriteria);
    setScores({});
    setReviewIndex(0);
    setSubmissionId(null);
    if (user) {
      const saved = await saveSubmission({
        intake,
        criteria: builtCriteria,
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
            </div>
          ) : null}
        </div>

        <Card>
          {step === "intake" ? (
            <CardBody>
              <IntakeForm initial={intake} onSubmit={handleIntakeSubmit} />
            </CardBody>
          ) : null}

          {step === "criteria" ? (
            <>
              <CardHeader>
                <h2 className="text-xl font-semibold tracking-tight">
                  {COPY.criteria.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                  {COPY.criteria.subtitle}
                </p>
              </CardHeader>
              <CardBody>
                <CriteriaBuilder
                  intake={intake}
                  initial={criteria}
                  onStart={handleStartReview}
                  onBack={() => setStep("intake")}
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
