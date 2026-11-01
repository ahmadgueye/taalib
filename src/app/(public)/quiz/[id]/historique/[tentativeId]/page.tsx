import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BackButton } from "@/components/public/back-button";
import { QuizCorrections } from "@/components/public/quiz-corrections";
import { getCurrentProfile } from "@/lib/auth/get-session";
import {
  getAttemptStatus,
  getTentativeDetail,
} from "@/lib/db/queries/quiz-tentatives";

type Props = {
  params: Promise<{ id: string; tentativeId: string }>;
};

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function QuizTentativeDetailPage({ params }: Props) {
  const { id, tentativeId } = await params;

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=/quiz/${id}/historique/${tentativeId}`);

  const detail = await getTentativeDetail(tentativeId, profile.id);
  if (!detail || detail.tentative.quizId !== id) notFound();

  const { tentative, corrections } = detail;
  const { showCorrections } = await getAttemptStatus(
    tentative.quiz,
    profile.id
  );

  return (
    <div className="animate-in fade-in duration-300">
      <BackButton />
      <nav className="mt-3 text-sm text-muted-foreground">
        <Link href={`/quiz/${id}`} className="hover:text-foreground">
          {tentative.quiz.title}
        </Link>{" "}
        /{" "}
        <Link href={`/quiz/${id}/historique`} className="hover:text-foreground">
          Historique
        </Link>{" "}
        /{" "}
        <span className="text-foreground">
          {new Date(tentative.completedAt).toLocaleDateString("fr-FR")}
        </span>
      </nav>

      <div className="mt-4 rounded-lg border p-4">
        <p className="font-heading text-2xl font-semibold">
          {tentative.score}/{tentative.totalQuestions}
        </p>
        <p className="text-sm text-muted-foreground">
          Tentative du{" "}
          {new Date(tentative.completedAt).toLocaleString("fr-FR", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      <div className="mt-6">
        {showCorrections ? (
          <QuizCorrections corrections={corrections} />
        ) : (
          <p className="text-sm text-muted-foreground">
            La correction détaillée sera disponible quand tu auras réussi le
            quiz ou utilisé toutes tes tentatives.
          </p>
        )}
      </div>
    </div>
  );
}
