"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/shared/Header";
import { Stepper } from "@/components/shared/Stepper";
import { IntakeForm } from "@/components/shared/IntakeForm";
import { CriteriaTable } from "@/components/shared/CriteriaTable";
import { ReviewStep } from "@/components/shared/ReviewStep";
import { SummaryView } from "@/components/shared/SummaryView";
import { useAuth } from "@/components/shared/AuthProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { COPY } from "@/constants/copy";
import { type FlowStepKey } from "@/config/global";
import { DEFAULT_TRACK_ID, getTrack } from "@/config/tracks";
import { generateCriteria } from "@/lib/mock-ai";
import { parseTracksFromIntake } from "@/lib/parse-tracks";
import { saveReview, saveSubmission } from "@/lib/persistence";
import type {
  Criterion,
  IntakeData,
  JudgeChatMessage,
  JudgeVerdict,
  ParsedTrack,
  RepoContext,
  ReviewScore,
} from "@/types";

const EMPTY_INTAKE: IntakeData = {
  trackId: "",
  repoUrl: "",
  productUrl: "",
  criteriaText: "",
  criteriaImage: null,
  conceptPdf: null,
};

interface DisplayTrack {
  id: string;
  name: string;
  tagline: string;
  description: string;
}

function resolveDisplayTrack(
  trackId: string,
  parsedTracks: ParsedTrack[],
): DisplayTrack {
  const parsed = parsedTracks.find((t) => t.id === trackId);
  if (parsed) {
    return {
      id: parsed.id,
      name: parsed.name,
      tagline: parsed.emphasis?.[0] ?? "Parsed track",
      description: parsed.description,
    };
  }
  const fallback = getTrack(trackId || DEFAULT_TRACK_ID);
  return {
    id: fallback.id,
    name: fallback.name,
    tagline: fallback.tagline,
    description: fallback.description,
  };
}

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
  const [parsedTracks, setParsedTracks] = useState<ParsedTrack[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Record<string, ReviewScore>>({});
  const [reviewIndex, setReviewIndex] = useState(0);
  const [parsingTracks, setParsingTracks] = useState(false);
  const [suggestingCriteria, setSuggestingCriteria] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<PersistState>("idle");
  const [repoContext, setRepoContext] = useState<RepoContext | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, JudgeVerdict>>({});
  const [chatHistories, setChatHistories] = useState<
    Record<string, JudgeChatMessage[]>
  >({});

  const selectedTrack = resolveDisplayTrack(intake.trackId, parsedTracks);

  async function handleParseTracks(data: IntakeData) {
    setIntake(data);
    setParsingTracks(true);
    try {
      const tracks = await parseTracksFromIntake(data);
      setParsedTracks(tracks);
      if (tracks.length > 0 && !data.trackId) {
        setIntake((prev) => ({ ...prev, trackId: tracks[0].id }));
      }
    } finally {
      setParsingTracks(false);
    }
  }

  function handleIntakeSubmit(data: IntakeData) {
    setIntake(data);
    if (criteria.length === 0) {
      // Seed from the default template; the criteria step lets the user
      // refine via "Suggest from attachments" using the chosen parsed track.
      setCriteria([...getTrack(DEFAULT_TRACK_ID).template]);
    }
    setStep("criteria");
  }

  async function handleSuggestFromAttachments() {
    setSuggestingCriteria(true);
    try {
      const generated = await generateCriteria(intake);
      setCriteria(generated);
      setScores({});
      setReviewIndex(0);
    } finally {
      setSuggestingCriteria(false);
    }
  }

  async function handleStartReview() {
    const finalCriteria = normalizeWeights(criteria);
    setCriteria(finalCriteria);
    setScores({});
    setVerdicts({});
    setChatHistories({});
    setReviewIndex(0);
    setSubmissionId(null);
    setStep("review");
    void fetchRepoContext(intake.repoUrl);
    if (user) {
      const saved = await saveSubmission({
        intake,
        criteria: finalCriteria,
        userId: user.id,
      });
      setSubmissionId(saved?.id ?? null);
    }
  }

  async function fetchRepoContext(repoUrl: string) {
    setRepoContext(null);
    try {
      const res = await fetch("/api/repo-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      if (!res.ok) return;
      const ctx = (await res.json()) as RepoContext;
      setRepoContext(ctx);
    } catch (err) {
      console.error("[repo-context] fetch failed:", err);
      setRepoContext({ source: "fallback", reason: "fetch_failed", files: [] });
    }
  }

  function handleVerdictChange(verdict: JudgeVerdict) {
    setVerdicts((prev) => ({ ...prev, [verdict.criterionId]: verdict }));
  }

  function handleChatHistoryChange(criterionId: string, messages: JudgeChatMessage[]) {
    setChatHistories((prev) => ({ ...prev, [criterionId]: messages }));
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
    setParsedTracks([]);
    setCriteria([]);
    setScores({});
    setVerdicts({});
    setChatHistories({});
    setRepoContext(null);
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
            </div>
          ) : null}
        </div>

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
                      {parsedTracks.length > 0 && intake.trackId ? (
                        <>
                          Track:{" "}
                          <span className="font-medium text-[var(--color-foreground)]">
                            {selectedTrack.name}
                          </span>{" "}
                          — {selectedTrack.tagline}
                        </>
                      ) : (
                        COPY.tracks.parseHint
                      )}
                    </p>
                  </div>
                  {parsedTracks.length > 0 && intake.trackId ? (
                    <Badge tone="info">{selectedTrack.tagline}</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardBody>
                <IntakeForm
                  initial={intake}
                  loading={parsingTracks}
                  parsing={parsingTracks}
                  parsedTracks={parsedTracks}
                  onSubmit={handleIntakeSubmit}
                  onParseTracks={handleParseTracks}
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
                  suggesting={suggestingCriteria}
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
                intake={intake}
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
