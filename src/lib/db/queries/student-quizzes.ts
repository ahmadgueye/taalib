import { asc, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db";
import {
  getExtraAttemptsForUser,
  getQuizScores,
} from "@/lib/db/queries/quiz-tentatives";
import { cours, quiz, thematiques } from "@/lib/db/schema";
import { canSeeQuiz, type ContentAccess } from "@/lib/content-access";
import { quizListStatus, type QuizListStatus } from "@/lib/quiz-list";

export type StudentQuiz = {
  id: string;
  title: string;
  coursTitle: string;
  thematiqueTitle: string;
  passingScore: number;
  status: QuizListStatus;
  // Tentatives restantes ; null = illimité.
  left: number | null;
  best: { score: number; total: number } | null;
  attemptsCount: number;
};

// Tous les quiz publiés visibles par l'utilisateur (débloqués pour l'une de
// ses classes, ou tous pour le staff), dans l'ordre du programme, avec où il
// en est (lib/quiz-list.ts). Mis en cache pour la requête : la pastille du
// menu et la page /quiz partagent le même calcul.
export const getStudentQuizzes = cache(async function getStudentQuizzes(
  userId: string,
  access: ContentAccess,
): Promise<StudentQuiz[]> {
  const rows = await db
    .select({
      id: quiz.id,
      title: quiz.title,
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
      thematiqueTitle: thematiques.title,
      coursTitle: cours.title,
    })
    .from(quiz)
    .innerJoin(thematiques, eq(thematiques.id, quiz.thematiqueId))
    .innerJoin(cours, eq(cours.id, thematiques.coursId))
    .where(eq(quiz.status, "published"))
    .orderBy(
      asc(cours.title),
      asc(thematiques.orderIndex),
      asc(thematiques.title),
      asc(quiz.orderIndex),
      asc(quiz.createdAt),
    );

  const visible = rows.filter((r) => canSeeQuiz(access, r.id));
  const ids = visible.map((r) => r.id);
  const [scores, extras] = await Promise.all([
    getQuizScores(userId, ids),
    getExtraAttemptsForUser(userId, ids),
  ]);

  return visible.map((r) => {
    const score = scores.get(r.id);
    const { status, left } = quizListStatus({
      passingScore: r.passingScore,
      maxAttempts: r.maxAttempts,
      extra: extras.get(r.id) ?? 0,
      score,
    });
    return {
      id: r.id,
      title: r.title,
      coursTitle: r.coursTitle,
      thematiqueTitle: r.thematiqueTitle,
      passingScore: r.passingScore,
      status,
      left,
      best: score ? { score: score.bestScore, total: score.bestTotal } : null,
      attemptsCount: score?.attemptsCount ?? 0,
    };
  });
});
