import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { History } from "lucide-react";

import { BackButton } from "@/components/public/back-button";
import { QuizAttempt } from "@/components/public/quiz-attempt";
import { Button } from "@/components/ui/button";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { canSeeQuiz } from "@/lib/content-access";
import { getQuizForAttempt } from "@/lib/db/queries/quiz";
import {
  getAttemptStatus,
  getQuizScores,
} from "@/lib/db/queries/quiz-tentatives";
import { defaultDescription, siteOpenGraph } from "@/lib/metadata";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [found, access] = await Promise.all([
    getQuizForAttempt(id),
    getContentAccess(),
  ]);
  const quiz = found && canSeeQuiz(access, found.id) ? found : null;
  const title = quiz?.title ?? "Quiz";
  const description = quiz?.description ?? defaultDescription;
  return {
    title: `${title} — Taalib`,
    description,
    openGraph: { ...siteOpenGraph, title, description },
  };
}

export default async function QuizPage({ params }: Props) {
  const { id } = await params;

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=/quiz/${id}`);

  const [quiz, access] = await Promise.all([
    getQuizForAttempt(id),
    getContentAccess(),
  ]);
  if (!quiz || !canSeeQuiz(access, quiz.id)) notFound();

  // Déjà tenté : un accès direct aux tentatives précédentes.
  const [scores, status] = await Promise.all([
    getQuizScores(profile.id, [quiz.id]),
    getAttemptStatus(quiz, profile.id),
  ]);
  const score = scores.get(quiz.id);

  return (
    <div className="animate-in fade-in duration-300">
      <BackButton />
      <nav className="mt-3 text-sm text-muted-foreground">
        <Link
          href={`/thematiques/${quiz.thematique.slug}`}
          className="hover:text-foreground"
        >
          {quiz.thematique.title}
        </Link>{" "}
        / <span className="text-foreground">{quiz.title}</span>
      </nav>

      <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
        {quiz.title}
      </h1>
      {quiz.description && (
        <p className="mt-2 text-muted-foreground">{quiz.description}</p>
      )}
      {score && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            {score.attemptsCount} tentative{score.attemptsCount > 1 ? "s" : ""}{" "}
            · meilleur score {score.bestScore}/{score.bestTotal}
          </span>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/quiz/${quiz.id}/historique`} />}
            nativeButton={false}
          >
            <History className="size-4" />
            Voir mes tentatives
          </Button>
        </div>
      )}
      {status.left !== null && status.left > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-destructive">
            {status.used === 0
              ? `Ce quiz est limité à ${status.left} tentative${status.left > 1 ? "s" : ""}.`
              : `Il te reste ${status.left} tentative${status.left > 1 ? "s" : ""}.`}
          </span>
          {quiz.hideCorrections &&
            !status.passed &&
            " La correction détaillée s'affichera quand tu auras réussi le quiz ou utilisé toutes tes tentatives."}
        </p>
      )}

      <QuizAttempt
        quizId={quiz.id}
        questions={quiz.questions}
        locked={status.left === 0}
      />
    </div>
  );
}
