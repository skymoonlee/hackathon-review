# Hackathon Reviewer

AI-assisted judging dashboard for hackathons. Drop in the hackathon's **concept PDF** and the project's **GitHub + product link** — the app extracts tracks, sponsors, and a rubric from the PDF, pulls the repo for context, and runs a multi-persona AI judge panel that scores every criterion with cited evidence.

> Built as a hackathon demo. Optimized for a clean end-to-end flow, not for production hardening.

---

## What it does

The whole pipeline is driven by **one upload**: the hackathon's concept PDF.

1. **Parse the hackathon from a PDF.** Drop the concept doc and the app extracts:
   - **Tracks** — normalized to canonical category names (e.g. *"🛰️ Always-On Agents 🛰️"* → *"AI Agents"*), with abstract emphasis tags.
   - **Sponsors per track** — when the PDF attaches companies to a track ("sponsored by", logos next to a section), the app pulls them out by plain brand name.
   - **A judging rubric** — criteria, descriptions, weights, and a score scale, derived from the PDF (and any extra criteria image / notes you add).
2. **Pick the track and lock the rubric.** Every judge in the panel scores the same project against the same criteria. Weights auto-normalize to 100%.
3. **Publish the submission.** Repo URL, product URL, attachments, and the locked rubric are stored together. Other judges open the project from the Submissions tab and score it under the exact same rubric.
4. **AI judges, criterion by criterion.** For each criterion, the app:
   - Pulls the GitHub repo via Nia (file tree, README, key files, shape signal) so scoring is grounded in real code.
   - Spins up a **judge persona per sponsor** (e.g. an *"InsForge representative"*) — each persona gets the same rubric but a viewpoint shaped by what its sponsor cares about.
   - Streams reasoning live, then emits a structured score with cited evidence (file paths and concrete observations).
   - Lets you **override the score** and **chat with the agent** to push back on its rationale.
5. **Summary & leaderboard.** Final weighted total per project, plus an all-time leaderboard grouped by track that averages multiple reviews.

---

## Core features

### PDF-driven hackathon setup
- **Multimodal PDF parsing** — pages are rendered to images and sent to a vision-capable model so layout-heavy concept docs (logos, callout boxes, sponsor strips) work, not just text.
- **Category normalization** — track names are forced into clean, canonical industry categories so the rubric is comparable across hackathons. Emojis and marketing copy are stripped.
- **Sponsor extraction** — sponsors are tied to the track they back. This is what powers the multi-persona panel later.
- **Saved presets** — frequent hackathons can be loaded as a preset (tracks + rubric pre-populated) instead of re-uploading the PDF every time.

### Track-anchored, repo-grounded judging
- Every team in a track is judged under the **same** track context (name, tagline, description, emphasis) — the same word can mean different things across tracks ("polish" in *Consumer* ≠ "polish" in *Infrastructure*), so the prompt anchors interpretation to the parsed track.
- The repo is pulled via **Nia** for context: file tree, README, key manifest files (`package.json`, `pyproject.toml`, `go.mod`, …), and a shape sample. The judge cites file paths in its evidence.
- Scoring is **per-criterion** with a streaming `[REASONING] … [SCORE_JSON] {…}` protocol — reasoning shows up live, then a strict JSON verdict with `value`, `rationale`, and `evidence[]`.

### Multi-persona judge panel
- One panel seat per sponsor on the track. Each persona has a `viewpoint` injected into its system prompt — but the prompt explicitly forbids rewarding a project for using that sponsor's product or penalizing it for using a competitor. The viewpoint shapes *which evidence is salient*, not whether the rubric is followed.
- Per-criterion verdict aggregates per-persona scores into a panel mean.
- A built-in **chat panel** lets the judge push back on the agent's reasoning per criterion.

### Submissions, reviews, leaderboard
- **Submissions list** — every published project with its locked rubric. Each judge sees the same view.
- **Reviews per submission** — one review per judge per project. Final scores are stored with the same rubric snapshot they were scored against, so historical scores stay valid even if presets later change.
- **Leaderboard** — grouped by track, ranked by weighted score, multi-judge averages.

### Demo-friendly defaults
- **Guest mode** — try the flow end-to-end without signing in (reviews are kept locally).
- **Mock AI fallback** — if `OPENAI_API_KEY` isn't configured the rubric falls back to a built-in mock so the UI flow always works.

---

## Architecture

```
src/
├── app/                      # Next.js 16 App Router pages + API routes
│   ├── api/parse-tracks/     # PDF → tracks + sponsors (multimodal)
│   ├── api/generate-criteria/# Attachments → rubric criteria
│   ├── api/repo-context/     # GitHub repo signal via Nia
│   ├── api/judge/            # Streaming per-criterion judge (per persona)
│   └── api/judge-chat/       # Push-back chat with the judge
├── components/
│   ├── ui/                   # Primitives (Button, Card, FileDrop, Dialog, …)
│   └── shared/               # IntakeForm, CriteriaTable, JudgeStream, Leaderboard, …
├── config/                   # Brand, routes, flow steps, env, fallback tracks
├── constants/copy.ts         # All UI copy in one SSOT
├── lib/                      # PDF rendering, repo context, persistence, personas, sse
└── types/                    # Shared TS types (Submission, Criterion, JudgeVerdict, …)
```

### Data flow

```
 Concept PDF + criteria image + notes
            │
            ▼
   /api/parse-tracks   (multimodal LLM → normalized tracks + sponsors)
            │
            ▼
   /api/generate-criteria  (attachments → rubric criteria)
            │
            ▼
       Publish submission   ──►  InsForge: submissions, reviews, presets, storage
            │
            ▼
   For each criterion:
     /api/repo-context   (Nia: tree + README + key files)
            │
            ▼
     /api/judge          (one stream per persona; reasoning → score JSON)
            │
            ▼
     Judge overrides + /api/judge-chat (push back, ask for evidence)
            │
            ▼
     Weighted total → Submission detail → Leaderboard
```

---

## Tech stack

| Area      | Tech                                                          |
| --------- | ------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, Server + Client Components)           |
| Language  | TypeScript (strict)                                           |
| UI        | React 19 + Tailwind CSS v4                                    |
| Backend   | InsForge (auth, Postgres, storage, RLS via migrations)        |
| AI        | OpenAI SDK — multimodal PDF parsing + streaming judge         |
| PDF       | `pdf-to-png-converter` — concept PDF pages → images for the model |
| Repo RAG  | Nia CLI — repo tree, key files, shape signal                  |

---

## Getting started

### 1. Install
```bash
npm install
```

### 2. Configure environment

Copy `.env.example` → `.env` and fill in:

| Variable                              | Purpose                                       |
| ------------------------------------- | --------------------------------------------- |
| `OPENAI_API_KEY`                      | Powers PDF parsing, criteria generation, and the judge panel. Without it, the rubric falls back to mock data. |
| `OPENAI_MODEL`                        | Override the default model (multimodal-capable required for PDF parsing). |
| `INSFORGE_URL`, `INSFORGE_API_KEY`, `INSFORGE_PROJECT_ID`, `INSFORGE_OSS_HOST` | Backend persistence (submissions, reviews, presets, storage). |
| `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`, `NEXT_PUBLIC_INSFORGE_OSS_HOST` | Client-side InsForge auth. |
| `NIA_API_KEY`                         | Nia CLI auth for repo context.                |
| `GITHUB_TOKEN`                        | Optional — higher GitHub API rate limit when fetching repo trees. |

### 3. Run
```bash
npm run dev
```
Open http://localhost:3000.

### 4. Try the flow
1. **Register** tab → drop a hackathon concept PDF → "Parse PDF for tracks".
2. Pick the track you want to judge → review the auto-generated rubric → **Publish submission**.
3. **Submissions** tab → open the project → **Start your review**.
4. Watch the panel reason through each criterion, override scores if you disagree, then see the weighted summary.
5. **Leaderboard** tab to see ranked projects per track.

---

## Project conventions

This repo follows a small set of hard rules — see [`CLAUDE.md`](./CLAUDE.md) for the full spec. The short version:

- **No hardcoding** — labels, sizes, thresholds, IDs all live in `src/config/`, `src/constants/copy.ts`, or env.
- **Reuse shared components** — `src/components/ui` and `src/components/shared` first; extract on the second occurrence.
- **Dynamic rendering** — options/criteria/menu items always come from `as const` arrays and render via `.map()`.
- **Secrets only in `.env`** — never inline keys, never commit `.env`.
- **InsForge for backend work** — go through the `insforge` skill / migrations rather than raw SQL.

---

## Repository

GitHub: https://github.com/skymoonlee/hackathon-review
