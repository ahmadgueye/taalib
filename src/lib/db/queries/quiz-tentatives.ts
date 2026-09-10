import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { quizQuestions, quizTentatives } from "@/lib/db/schema";

export type QuizScore = {
  lastScore: number;
  lastTotal: number;
  bestScore: number;
  bestTotal: number;
  attemptsCount: number;
};

export async function getQuizScores(userId: string, quizIds: string[]) {
  const scores = new Map<string, QuizScore>();
  if (quizIds.length === 0) return scores;

  const rows = await db.query.quizTentatives.findMany({
    where: and(
      eq(quizTentatives.userId, userId),
      inArray(quizTentatives.quizId, quizIds)
    ),
    orderBy: [desc(quizTentatives.completedAt)],
  });

  for (const row of rows) {
    const existing = scores.get(row.quizId);
    if (!existing) {
      scores.set(row.quizId, {
        lastScore: row.score,
        lastTotal: row.totalQuestions,
        bestScore: row.score,
        bestTotal: row.totalQuestions,
        attemptsCount: 1,
      });
      continue;
    }
    existing.attemptsCount += 1;
    if (row.score / row.totalQuestions > existing.bestScore / existing.bestTotal) {
      existing.bestScore = row.score;
      existing.bestTotal = row.totalQuestions;
    }
  }

  return scores;
}

export async function getTentativeDetail(tentativeId: string, userId: string) {
  const tentative = await db.query.quizTentatives.findFirst({
    where: and(
      eq(quizTentatives.id, tentativeId),
      eq(quizTentatives.userId, userId)
    ),
    with: {
      quiz: true,
      reponses: true,
    },
  });
  if (!tentative) return null;

  const questions = await db.query.quizQuestions.findMany({
    where: eq(quizQuestions.quizId, tentative.quizId),
    orderBy: [asc(quizQuestions.orderIndex)],
    with: {
      choix: { orderBy: (choix, { asc }) => [asc(choix.orderIndex)] },
    },
  });

  const selectedByQuestion = new Map<string, Set<string>>();
  for (const reponse of tentative.reponses) {
    const set = selectedByQuestion.get(reponse.questionId) ?? new Set();
    set.add(reponse.choixId);
    selectedByQuestion.set(reponse.questionId, set);
  }

  return {
    tentative,
    questions: questions.map((q) => ({
      ...q,
      selectedChoixIds: selectedByQuestion.get(q.id) ?? new Set<string>(),
    })),
  };
}
