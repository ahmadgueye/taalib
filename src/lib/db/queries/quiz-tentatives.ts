import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { quizQuestions, quizReponses, quizTentatives } from "@/lib/db/schema";

export type QuizScore = {
  lastScore: number;
  lastTotal: number;
  bestScore: number;
  bestTotal: number;
  attemptsCount: number;
};

export type QuizCorrection = {
  questionId: string;
  prompt: string;
  explanation: string | null;
  selectedChoixIds: string[];
  choix: { id: string; label: string; isCorrect: boolean }[];
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

export async function getTentativesForQuiz(quizId: string, userId: string) {
  return db.query.quizTentatives.findMany({
    where: and(
      eq(quizTentatives.quizId, quizId),
      eq(quizTentatives.userId, userId)
    ),
    orderBy: [desc(quizTentatives.completedAt)],
  });
}

export async function getQuizAttemptsSummary(userId: string) {
  const rows = await db.query.quizTentatives.findMany({
    where: eq(quizTentatives.userId, userId),
    orderBy: [desc(quizTentatives.completedAt)],
    with: {
      quiz: { with: { thematique: true } },
    },
  });

  const byQuizId = new Map<
    string,
    {
      quiz: (typeof rows)[number]["quiz"];
      lastScore: number;
      lastTotal: number;
      lastCompletedAt: Date;
      bestScore: number;
      bestTotal: number;
      attemptsCount: number;
    }
  >();

  for (const row of rows) {
    const existing = byQuizId.get(row.quizId);
    if (!existing) {
      byQuizId.set(row.quizId, {
        quiz: row.quiz,
        lastScore: row.score,
        lastTotal: row.totalQuestions,
        lastCompletedAt: row.completedAt,
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

  return Array.from(byQuizId.values()).sort(
    (a, b) => b.lastCompletedAt.getTime() - a.lastCompletedAt.getTime()
  );
}

export async function getQuizSubmissionStats(quizId: string) {
  const tentatives = await db.query.quizTentatives.findMany({
    where: eq(quizTentatives.quizId, quizId),
    orderBy: [desc(quizTentatives.completedAt)],
    with: {
      user: { columns: { id: true, fullName: true, email: true } },
    },
  });

  const uniqueUsersCount = new Set(tentatives.map((t) => t.userId)).size;
  const averagePercent =
    tentatives.length === 0
      ? null
      : (tentatives.reduce((sum, t) => sum + t.score / t.totalQuestions, 0) /
          tentatives.length) *
        100;

  // `tentatives` is already sorted most-recent-first, so the first attempt
  // seen per student is also their last one.
  const byStudent = new Map<
    string,
    {
      user: (typeof tentatives)[number]["user"];
      attempts: typeof tentatives;
      bestScore: number;
      bestTotal: number;
      lastCompletedAt: Date;
      attemptsCount: number;
    }
  >();
  for (const t of tentatives) {
    const existing = byStudent.get(t.userId);
    if (!existing) {
      byStudent.set(t.userId, {
        user: t.user,
        attempts: [t],
        bestScore: t.score,
        bestTotal: t.totalQuestions,
        lastCompletedAt: t.completedAt,
        attemptsCount: 1,
      });
      continue;
    }
    existing.attempts.push(t);
    existing.attemptsCount += 1;
    if (t.score / t.totalQuestions > existing.bestScore / existing.bestTotal) {
      existing.bestScore = t.score;
      existing.bestTotal = t.totalQuestions;
    }
  }

  return {
    tentatives,
    attemptsCount: tentatives.length,
    uniqueUsersCount,
    averagePercent,
    students: Array.from(byStudent.values()).sort(
      (a, b) => b.lastCompletedAt.getTime() - a.lastCompletedAt.getTime()
    ),
  };
}

export async function getQuizQuestionStats(quizId: string) {
  const questions = await db.query.quizQuestions.findMany({
    where: eq(quizQuestions.quizId, quizId),
    orderBy: [asc(quizQuestions.orderIndex)],
    with: { choix: true },
  });
  if (questions.length === 0) return [];

  const tentativeIds = (
    await db.query.quizTentatives.findMany({
      where: eq(quizTentatives.quizId, quizId),
      columns: { id: true },
    })
  ).map((t) => t.id);

  if (tentativeIds.length === 0) {
    return questions.map((q) => ({
      questionId: q.id,
      prompt: q.prompt,
      correctCount: 0,
      totalCount: 0,
    }));
  }

  const reponses = await db.query.quizReponses.findMany({
    where: inArray(quizReponses.tentativeId, tentativeIds),
  });

  const selectedByKey = new Map<string, Set<string>>();
  for (const r of reponses) {
    const key = `${r.tentativeId}:${r.questionId}`;
    const set = selectedByKey.get(key) ?? new Set<string>();
    set.add(r.choixId);
    selectedByKey.set(key, set);
  }

  return questions.map((q) => {
    const correctIds = new Set(
      q.choix.filter((c) => c.isCorrect).map((c) => c.id)
    );
    let correctCount = 0;
    for (const tentativeId of tentativeIds) {
      const selected =
        selectedByKey.get(`${tentativeId}:${q.id}`) ?? new Set<string>();
      const isCorrect =
        selected.size === correctIds.size &&
        [...selected].every((id) => correctIds.has(id));
      if (isCorrect) correctCount += 1;
    }
    return {
      questionId: q.id,
      prompt: q.prompt,
      correctCount,
      totalCount: tentativeIds.length,
    };
  });
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

  const selectedByQuestion = new Map<string, string[]>();
  for (const reponse of tentative.reponses) {
    const list = selectedByQuestion.get(reponse.questionId) ?? [];
    list.push(reponse.choixId);
    selectedByQuestion.set(reponse.questionId, list);
  }

  const corrections: QuizCorrection[] = questions.map((q) => ({
    questionId: q.id,
    prompt: q.prompt,
    explanation: q.explanation,
    selectedChoixIds: selectedByQuestion.get(q.id) ?? [],
    choix: q.choix.map((c) => ({
      id: c.id,
      label: c.label,
      isCorrect: c.isCorrect,
    })),
  }));

  return { tentative, corrections };
}
