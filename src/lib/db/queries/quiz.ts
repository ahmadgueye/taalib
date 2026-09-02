import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { quiz, quizQuestions } from "@/lib/db/schema";

export async function getAllQuiz() {
  return db.query.quiz.findMany({
    orderBy: [asc(quiz.title)],
    with: {
      thematique: { with: { cours: true } },
      questions: true,
    },
  });
}

export async function getQuizById(id: string) {
  const result = await db.query.quiz.findFirst({
    where: eq(quiz.id, id),
  });

  return result ?? null;
}

export async function getQuizWithQuestions(id: string) {
  const result = await db.query.quiz.findFirst({
    where: eq(quiz.id, id),
    with: {
      questions: {
        orderBy: [asc(quizQuestions.orderIndex)],
        with: {
          choix: { orderBy: (choix, { asc }) => [asc(choix.orderIndex)] },
        },
      },
    },
  });

  return result ?? null;
}

// Réservé à la page publique "passer le quiz" : ne projette jamais
// `isCorrect`, pour que la bonne réponse ne transite jamais vers le
// navigateur avant la soumission (la correction se fait côté serveur dans
// lib/actions/quiz-tentatives.ts).
export async function getQuizForAttempt(id: string) {
  const result = await db.query.quiz.findFirst({
    where: and(eq(quiz.id, id), eq(quiz.status, "published")),
    with: {
      thematique: { with: { cours: true } },
      questions: {
        orderBy: [asc(quizQuestions.orderIndex)],
        columns: { id: true, prompt: true, type: true },
        with: {
          choix: {
            orderBy: (choix, { asc }) => [asc(choix.orderIndex)],
            columns: { id: true, label: true },
          },
        },
      },
    },
  });

  return result ?? null;
}
