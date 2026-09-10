"use server";

import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { quizQuestions, quizReponses, quizTentatives } from "@/lib/db/schema";

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
      corrections: {
        questionId: string;
        prompt: string;
        explanation: string | null;
        selectedChoixIds: string[];
        choix: { id: string; label: string; isCorrect: boolean }[];
      }[];
    };

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

  let score = 0;
  const rowsToInsert: { questionId: string; choixId: string }[] = [];
  const corrections: Extract<SubmitQuizResult, { score: number }>["corrections"] = [];

  for (const question of questions) {
    const selected = answersByQuestion.get(question.id) ?? new Set<string>();
    const correctIds = new Set(
      question.choix.filter((c) => c.isCorrect).map((c) => c.id)
    );
    const isCorrect =
      selected.size === correctIds.size &&
      [...selected].every((id) => correctIds.has(id));
    if (isCorrect) score += 1;

    for (const choixId of selected) {
      rowsToInsert.push({ questionId: question.id, choixId });
    }

    corrections.push({
      questionId: question.id,
      prompt: question.prompt,
      explanation: question.explanation,
      selectedChoixIds: [...selected],
      choix: question.choix.map((c) => ({
        id: c.id,
        label: c.label,
        isCorrect: c.isCorrect,
      })),
    });
  }

  // Les choix soumis mais inconnus du quiz (id trafiqué) sont ignorés
  // silencieusement plutôt que de planter la tentative — ils ne pourront de
  // toute façon jamais matcher `correctIds` ci-dessus.
  const validChoixIds = new Set(
    questions.flatMap((q) => q.choix.map((c) => c.id))
  );
  const safeRows = rowsToInsert.filter((r) => validChoixIds.has(r.choixId));

  const tentativeId = await db.transaction(async (tx) => {
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

    return tentative.id;
  });

  return { tentativeId, score, total: questions.length, corrections };
}
