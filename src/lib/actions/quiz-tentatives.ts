"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { canSeeQuiz } from "@/lib/content-access";
import { db } from "@/lib/db";
import {
  quiz,
  quizQuestions,
  quizReponses,
  quizTentatives,
} from "@/lib/db/schema";
import {
  getAttemptStatus,
  type QuizCorrection,
} from "@/lib/db/queries/quiz-tentatives";
import { canSeeCorrections, isPassing } from "@/lib/quiz-attempts";
import { gradeQuestions } from "@/lib/quiz-grading";

const submitSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      choixIds: z.array(z.string().uuid()),
    })
  ),
});

export type SubmitQuizResult =
  | { error: string }
  | {
      tentativeId: string;
      score: number;
      total: number;
      // Vide si la correction est masquée (voir canSeeCorrections).
      corrections: QuizCorrection[];
      showCorrections: boolean;
      // null : quiz illimité.
      attemptsLeft: number | null;
    };

const NO_ATTEMPT_LEFT = "Tu as utilisé toutes tes tentatives pour ce quiz.";

// La correction ne fait jamais confiance au client : on recharge les
// `isCorrect` réels depuis la base à partir des questions du quiz, jamais
// depuis le payload soumis, avant de calculer le score.
export async function submitQuizAttempt(
  quizId: string,
  answers: { questionId: string; choixIds: string[] }[]
): Promise<SubmitQuizResult> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Connecte-toi pour passer ce quiz." };
  }

  const parsed = submitSchema.safeParse({ quizId, answers });
  if (!parsed.success) {
    return { error: "Réponses invalides." };
  }

  // Un quiz en brouillon n'est jamais visible côté public : on refuse aussi
  // sa soumission, sinon la correction en révélerait les bonnes réponses.
  const publishedQuiz = await db.query.quiz.findFirst({
    columns: {
      id: true,
      passingScore: true,
      maxAttempts: true,
      hideCorrections: true,
    },
    where: and(eq(quiz.id, parsed.data.quizId), eq(quiz.status, "published")),
  });
  // Idem pour un quiz pas encore débloqué pour la classe de l'étudiant.
  if (!publishedQuiz || !canSeeQuiz(await getContentAccess(), publishedQuiz.id)) {
    return { error: "Quiz introuvable." };
  }

  const questions = await db.query.quizQuestions.findMany({
    where: eq(quizQuestions.quizId, parsed.data.quizId),
    orderBy: [asc(quizQuestions.orderIndex)],
    with: {
      choix: { orderBy: (choix, { asc }) => [asc(choix.orderIndex)] },
    },
  });
  if (questions.length === 0) {
    return { error: "Ce quiz n'a aucune question." };
  }

  const answersByQuestion = new Map(
    parsed.data.answers.map((a) => [a.questionId, new Set(a.choixIds)])
  );

  const { score, corrections } = gradeQuestions(questions, answersByQuestion);
  const rowsToInsert = corrections.flatMap((c) =>
    c.selectedChoixIds.map((choixId) => ({
      questionId: c.questionId,
      choixId,
    }))
  );

  // Les choix soumis mais inconnus du quiz (id trafiqué) sont ignorés
  // silencieusement plutôt que de planter la tentative — ils ne pourront de
  // toute façon jamais rendre une question juste (voir gradeQuestions).
  const validChoixIds = new Set(
    questions.flatMap((q) => q.choix.map((c) => c.id))
  );
  const safeRows = rowsToInsert.filter((r) => validChoixIds.has(r.choixId));

  const saved = await db.transaction(async (tx) => {
    // Deux soumissions simultanées du même étudiant passent l'une après
    // l'autre : la limite est comptée avant chaque enregistrement.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`${profile.id}:${publishedQuiz.id}`}))`
    );
    const status = await getAttemptStatus(publishedQuiz, profile.id, tx);
    if (status.left === 0) return null;

    const [tentative] = await tx
      .insert(quizTentatives)
      .values({
        quizId: parsed.data.quizId,
        userId: profile.id,
        score,
        totalQuestions: questions.length,
      })
      .returning({ id: quizTentatives.id });

    if (safeRows.length > 0) {
      await tx.insert(quizReponses).values(
        safeRows.map((r) => ({
          tentativeId: tentative.id,
          questionId: r.questionId,
          choixId: r.choixId,
        }))
      );
    }

    return { tentativeId: tentative.id, status };
  });
  if (!saved) return { error: NO_ATTEMPT_LEFT };

  const { status } = saved;
  const attemptsLeft = status.left === null ? null : status.left - 1;
  const showCorrections = canSeeCorrections(publishedQuiz, {
    left: attemptsLeft,
    passed:
      status.passed ||
      isPassing(score, questions.length, publishedQuiz.passingScore),
  });

  return {
    tentativeId: saved.tentativeId,
    score,
    total: questions.length,
    corrections: showCorrections ? corrections : [],
    showCorrections,
    attemptsLeft,
  };
}
