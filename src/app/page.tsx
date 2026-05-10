"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { Stepper } from "@/components/shared/Stepper";
import { IntakeForm } from "@/components/shared/IntakeForm";
import { CriteriaTable } from "@/components/shared/CriteriaTable";
import { useAuth } from "@/components/shared/AuthProvider";
import { CUSTOM_PRESET_VALUE } from "@/components/shared/PresetSelector";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { COPY } from "@/constants/copy";
import { ROUTES, type FlowStepKey } from "@/config/global";
import { DEFAULT_TRACK_ID, getTrack } from "@/config/tracks";
import { generateCriteria } from "@/lib/mock-ai";
import { parseTracksFromIntake } from "@/lib/parse-tracks";
import { fetchPresets } from "@/lib/presets";
import { saveSubmission } from "@/lib/persistence";
import { normalizeWeights } from "@/lib/track-context";
import type {
  Criterion,
  HackathonPreset,
  IntakeData,
  ParsedTrack,
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
      tagline: parsed.tagline ?? parsed.emphasis?.[0] ?? "Parsed track",
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

type PublishState = "idle" | "saving" | "failed" | "guest";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<FlowStepKey>("intake");
  const [intake, setIntake] = useState<IntakeData>(EMPTY_INTAKE);
  const [parsedTracks, setParsedTracks] = useState<ParsedTrack[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [parsingTracks, setParsingTracks] = useState(false);
  const [suggestingCriteria, setSuggestingCriteria] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [presets, setPresets] = useState<HackathonPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [selectedPresetSlug, setSelectedPresetSlug] = useState<string>(
    CUSTOM_PRESET_VALUE,
  );

  const selectedTrack = resolveDisplayTrack(intake.trackId, parsedTracks);

  useEffect(() => {
    let cancelled = false;
    setPresetsLoading(true);
    fetchPresets()
      .then((rows) => {
        if (cancelled) return;
        setPresets(rows);
        const def = rows.find((p) => p.isDefault) ?? rows[0];
        if (def) {
          applyPreset(def);
          setSelectedPresetSlug(def.slug);
        }
      })
      .finally(() => {
        if (!cancelled) setPresetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(preset: HackathonPreset) {
    setParsedTracks(preset.tracks);
    setIntake((prev) => ({
      ...prev,
      trackId: preset.tracks[0]?.id ?? "",
    }));
    setCriteria([]);
  }

  function handlePresetChange(slug: string) {
    setSelectedPresetSlug(slug);
    if (slug === CUSTOM_PRESET_VALUE) {
      setParsedTracks([]);
      setIntake((prev) => ({ ...prev, trackId: "" }));
      setCriteria([]);
      return;
    }
    const preset = presets.find((p) => p.slug === slug);
    if (preset) applyPreset(preset);
  }

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
    const chosen = parsedTracks.find((t) => t.id === data.trackId);
    if (chosen?.criteria && chosen.criteria.length > 0) {
      setCriteria(chosen.criteria.map((c) => ({ ...c })));
    } else if (criteria.length === 0) {
      setCriteria([...getTrack(DEFAULT_TRACK_ID).template]);
    }
    setStep("criteria");
  }

  async function handleSuggestFromAttachments() {
    setSuggestingCriteria(true);
    try {
      const generated = await generateCriteria(intake);
      setCriteria(generated);
    } finally {
      setSuggestingCriteria(false);
    }
  }

  async function handlePublish() {
    if (!user) {
      setPublishState("guest");
      return;
    }
    const finalCriteria = normalizeWeights(criteria);
    setCriteria(finalCriteria);
    setPublishState("saving");
    setStep("publish");
    const trackSnapshot =
      parsedTracks.find((t) => t.id === intake.trackId) ?? null;
    const saved = await saveSubmission({
      intake,
      criteria: finalCriteria,
      userId: user.id,
      trackSnapshot,
    });
    if (saved?.id) {
      router.push(ROUTES.submissionDetail(saved.id));
    } else {
      setPublishState("failed");
      setStep("criteria");
    }
  }

  const canSuggest =
    intake.criteriaText.trim().length > 0 ||
    intake.criteriaImage !== null ||
    intake.conceptPdf !== null;

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
                <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {COPY.publish.guestBlock}
                </p>
              ) : null}
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
                  presets={presets}
                  presetsLoading={presetsLoading}
                  selectedPresetSlug={selectedPresetSlug}
                  onPresetChange={handlePresetChange}
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
                {publishState === "failed" ? (
                  <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {COPY.publish.failed}
                  </p>
                ) : null}
                {publishState === "guest" ? (
                  <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {COPY.publish.guestBlock}
                  </p>
                ) : null}
                <CriteriaTable
                  criteria={criteria}
                  onChange={setCriteria}
                  onStart={handlePublish}
                  onBack={() => setStep("intake")}
                  onSuggest={handleSuggestFromAttachments}
                  suggesting={suggestingCriteria}
                  canSuggest={canSuggest}
                />
              </CardBody>
            </>
          ) : null}

          {step === "publish" ? (
            <>
              <CardHeader>
                <h2 className="text-xl font-semibold tracking-tight">
                  {COPY.publish.title}
                </h2>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-[var(--color-foreground-muted)]" />
                  <p className="text-sm text-[var(--color-foreground-muted)]">
                    {COPY.publish.saving}
                  </p>
                </div>
              </CardBody>
            </>
          ) : null}
        </Card>

        <div className="mt-6 flex justify-end">
          <Link href={ROUTES.submissions}>
            <Button variant="ghost" size="sm">
              Browse all submissions →
            </Button>
          </Link>
        </div>
      </main>
      <footer className="border-t border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-foreground-muted)]">
        Built for hackathon judging · powered by Next.js · InsForge · OpenAI · Nia
      </footer>
    </div>
  );
}
