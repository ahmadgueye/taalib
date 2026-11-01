import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { History } from "lucide-react";

import { BackButton } from "@/components/public/back-button";
import { QuizAttempt } from "@/components/public/quiz-attempt";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { canSeeQuiz } from "@/lib/content-access";
import { getQuizForAttempt } from "@/lib/db/queries/quiz";
import { getQuizScores } from "@/lib/db/queries/quiz-tentatives";
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
  const score = (await getQuizScores(profile.id, [quiz.id])).get(quiz.id);

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
        <Link
          href={`/quiz/${quiz.id}/historique`}
          className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4"
        >
          <History className="size-4" />
          {score.attemptsCount} tentative{score.attemptsCount > 1 ? "s" : ""} ·
          meilleur score {score.bestScore}/{score.bestTotal} · voir mes
          tentatives
        </Link>
      )}

      <QuizAttempt quizId={quiz.id} questions={quiz.questions} />
    </div>
  );
}
