import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BackButton } from "@/components/public/back-button";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getQuizWithThematique } from "@/lib/db/queries/quiz";
import { getTentativesForQuiz } from "@/lib/db/queries/quiz-tentatives";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function QuizHistoriquePage({ params }: Props) {
  const { id } = await params;

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=/quiz/${id}/historique`);

  const quiz = await getQuizWithThematique(id);
  if (!quiz) notFound();

  const tentatives = await getTentativesForQuiz(id, profile.id);

  return (
    <div className="animate-in fade-in duration-300">
      <BackButton />
      <nav className="mt-3 text-sm text-muted-foreground">
        <Link href={`/quiz/${quiz.id}`} className="hover:text-foreground">
          {quiz.title}
        </Link>{" "}
        / <span className="text-foreground">Historique</span>
      </nav>

      <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
        Historique — {quiz.title}
      </h1>

      {tentatives.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Tu n&apos;as pas encore tenté ce quiz.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {tentatives.map((tentative) => {
            const percent = (tentative.score / tentative.totalQuestions) * 100;
            const passed = percent >= quiz.passingScore;
            return (
              <Link
                key={tentative.id}
                href={`/quiz/${quiz.id}/historique/${tentative.id}`}
                className="flex items-center justify-between gap-2 border p-4 transition-colors hover:bg-muted"
              >
                <span className="text-sm text-muted-foreground">
                  {new Date(tentative.completedAt).toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <Badge
                  className={cn(
                    passed
                      ? "bg-emerald-600 text-white dark:bg-emerald-500"
                      : "bg-destructive text-white"
                  )}
                >
                  {tentative.score}/{tentative.totalQuestions}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
