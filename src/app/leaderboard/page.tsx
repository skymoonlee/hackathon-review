import { Header } from "@/components/shared/Header";
import { LeaderboardView } from "@/components/shared/LeaderboardView";

export default function LeaderboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <LeaderboardView />
      </main>
      <footer className="border-t border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-foreground-muted)]">
        Built for hackathon judging · powered by Next.js · InsForge · OpenAI · Nia
      </footer>
    </div>
  );
}
