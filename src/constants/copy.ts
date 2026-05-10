export const COPY = {
  hero: {
    eyebrow: "Hackathon judging, simplified",
    title: "Set your rubric. Score one thing at a time.",
    subtitle:
      "Paste the repo and product links, add your judging criteria below, then walk through them one by one. Sign in if you want your reviews saved across devices.",
  },
  intake: {
    repoUrl: {
      label: "GitHub repository",
      placeholder: "https://github.com/<owner>/<repo>",
    },
    productUrl: {
      label: "Product website",
      placeholder: "https://your-product.example.com",
    },
    criteriaText: {
      label: "Criteria notes (optional)",
      placeholder:
        "Paste your judging notes here, or leave empty and we'll derive a rubric from the track + attachments.",
    },
    parseAttachments: "Parse from attachments",
    parsing: "Reading attachments…",
    parseHint: "Drop the criteria image / concept PDF and we'll fill the rubric for you.",
    submit: "Continue",
    submitLoading: "Continuing…",
  },
  tracks: {
    eyebrow: "Hackathon track",
    title: "Pick the track you're judging",
    subtitle:
      "The rubric will lean on this track's emphasis. You can still tweak every row before scoring.",
    dropdownLabel: "Track",
    dropdownPlaceholder: "Select a track",
    dropdownLocked: "Pick a saved hackathon or parse a concept PDF to load tracks",
    parseButton: "Parse PDF for tracks",
    parsing: "Reading concept PDF…",
    parseHint: "Drop a concept PDF, then parse it to load the hackathon's tracks.",
    parsedTitle: "Tracks for this hackathon",
    parsedSubtitle: "Confirm the track you're judging from the dropdown above.",
    parsedColumns: {
      name: "Track",
      description: "Description",
      emphasis: "Emphasis",
    },
    parsedEmpty: "No tracks were extracted from the PDF.",
  },
  presets: {
    label: "Saved hackathon",
    description:
      "Skip the PDF — load tracks and rubric from a saved hackathon preset.",
    customLabel: "Custom (upload concept PDF)",
    customDescription: "Parse tracks from your own concept PDF.",
    loadedTag: "Loaded from preset",
    loading: "Loading saved hackathons…",
    empty: "No saved hackathons available.",
    sourcePreset: (name: string) => `Tracks loaded from ${name}`,
    sourcePdf: "Tracks parsed from concept PDF",
  },
  criteria: {
    title: "Judging rubric",
    subtitle:
      "Add the criteria you'll use to judge this project. Weights are auto-normalized — they don't need to sum to exactly 1.",
    addRow: "Add criterion",
    removeRow: "Remove",
    suggest: "Suggest from attachments",
    suggesting: "Reading attachments…",
    suggestNoFiles: "Attach a criteria image or concept PDF first.",
    startReview: "Start review",
    back: "Back to intake",
    weightsHint: "Tip: weights get normalized to 100% on submit.",
    columns: {
      criterion: "Criterion",
      description: "What we look for",
      weight: "Weight",
      scale: "Scale",
    },
    fields: {
      title: "Title",
      description: "Description",
      weight: "Weight",
      scale: "Scale",
    },
    placeholders: {
      title: "e.g. Innovation",
      description: "What does a great score look like for this criterion?",
    },
    empty: "No criteria yet. Add your first one below.",
  },
  review: {
    progress: (current: number, total: number) => `Step ${current} of ${total}`,
    notesLabel: "Notes (optional)",
    notesPlaceholder: "Anything specific you noticed for this criterion…",
    next: "Next",
    finish: "Finish review",
    back: "Back",
  },
  judge: {
    indexing: "Pulling repo via Nia…",
    indexingDone: (owner: string, repo: string) => `Repo ready · ${owner}/${repo}`,
    indexingFailed: "Couldn't fetch repo signal — judging without it.",
    noRepo: "No GitHub URL — judging from intake notes only.",
    thinkingHeader: "Agent is judging this criterion",
    thinkingHint: "Streaming reasoning, then a score with cited evidence.",
    verdictHeader: "Agent verdict",
    verdictScore: (value: number, max: number) => `Suggested score: ${value} / ${max}`,
    overrideHint: "Override the score with the buttons below if you disagree.",
    rerun: "Re-run agent",
    starting: "Starting…",
    fallbackBanner: "Agent fell back to a default — check evidence below.",
    chatHeader: "Ask the agent",
    chatPlaceholder: "Why this score? Push back on the rationale, ask for evidence…",
    chatSend: "Send",
    chatThinking: "Thinking…",
    chatEmpty: "Ask the agent why it landed on this score, or push back on the rationale.",
  },
  summary: {
    title: "Review summary",
    subtitle: "Final scores and weighted average across all criteria.",
    totalLabel: "Weighted total",
    restart: "Start a new review",
    download: "Download as JSON",
  },
  guest: {
    banner:
      "You're using Hackathon Reviewer as a guest. Reviews are kept locally — sign in to save them across devices.",
  },
  howItWorks: {
    title: "How it works",
    steps: [
      {
        id: "pick",
        title: "Pick a track",
        description:
          "Choose the closest hackathon track. We pre-fill a tailored rubric you can edit.",
      },
      {
        id: "intake",
        title: "Drop the project",
        description:
          "Repo link, product link, and any criteria image or concept PDF you want to attach.",
      },
      {
        id: "judge",
        title: "Score one by one",
        description:
          "Walk through each criterion, leave notes, and get an auto-weighted summary at the end.",
      },
    ],
  },
  empty: {
    noCriteria: "No criteria available yet.",
  },
  leaderboard: {
    eyebrow: "All-time scores",
    title: "Leaderboard",
    subtitle:
      "Every reviewed project, grouped by track and ranked by weighted score. Multiple reviews on the same project are averaged.",
    emptyTitle: "No reviews yet",
    emptyBody:
      "Once judges finish at least one review, scored projects will show up here grouped by track.",
    loading: "Loading leaderboard…",
    failed: "Couldn't load leaderboard — try refreshing.",
    guest: "Sign in to view the leaderboard — review data is read by signed-in judges only.",
    columns: {
      rank: "#",
      project: "Project",
      links: "Links",
      reviews: "Reviews",
      score: "Score",
    },
    repoLink: "Repo",
    productLink: "Website",
    reviewsCount: (n: number) => `${n} review${n === 1 ? "" : "s"}`,
    untitledTrack: "Untracked",
    noLink: "—",
  },
} as const;
