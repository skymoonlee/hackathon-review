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
    submit: "Continue",
    submitLoading: "Continuing…",
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
  summary: {
    title: "Review summary",
    subtitle: "Final scores and weighted average across all criteria.",
    totalLabel: "Weighted total",
    restart: "Start a new review",
    download: "Download as JSON",
  },
  guest: {
    banner:
      "You're using Hackathon Review as a guest. Reviews are kept locally — sign in to save them across devices.",
  },
  empty: {
    noCriteria: "No criteria available yet.",
  },
} as const;
