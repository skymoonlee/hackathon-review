import { Header } from "@/components/shared/Header";
import { SubmissionReviewView } from "@/components/shared/SubmissionReview";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionReviewPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <SubmissionReviewView submissionId={id} />
      </main>
      <footer className="border-t border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-foreground-muted)]">
        Built for hackathon judging · powered by Next.js · InsForge · OpenAI · Nia
      </footer>
    </div>
  );
}
