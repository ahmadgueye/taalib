import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { getAllCours, getCoursOutline } from "@/lib/db/queries/cours";
import { getCompletedRessourceIds } from "@/lib/db/queries/progress";
import { getQuizScores, type QuizScore } from "@/lib/db/queries/quiz-tentatives";
import { parcours, parcoursEtapes, quiz } from "@/lib/db/schema";

export async function getAllParcours() {
  return db.query.parcours.findMany({
    orderBy: [asc(parcours.createdAt)],
    with: {
      etapes: {
        orderBy: [asc(parcoursEtapes.orderIndex)],
        with: { cours: true },
      },
    },
  });
}

export async function getParcoursById(id: string) {
  const result = await db.query.parcours.findFirst({
    where: eq(parcours.id, id),
    with: {
      etapes: {
        orderBy: [asc(parcoursEtapes.orderIndex)],
        with: { cours: true },
      },
    },
  });

  return result ?? null;
}

function parcoursWithProgressData() {
  return {
    etapes: {
      orderBy: [asc(parcoursEtapes.orderIndex)],
      with: {
        cours: {
          with: {
            thematiques: {
              with: {
                quiz: { where: eq(quiz.status, "published") },
              },
            },
          },
        },
      },
    },
  };
}

export async function getFirstParcours() {
  const result = await db.query.parcours.findFirst({
    orderBy: [asc(parcours.createdAt)],
    with: parcoursWithProgressData(),
  });

  return result ?? null;
}

export async function getParcoursBySlug(slug: string) {
  const result = await db.query.parcours.findFirst({
    where: eq(parcours.slug, slug),
    with: parcoursWithProgressData(),
  });

  return result ?? null;
}

export type ParcoursWithProgress = NonNullable<
  Awaited<ReturnType<typeof getFirstParcours>>
>;

export type ParcoursStepState = "completed" | "active" | "locked";

export type ParcoursStep = {
  etapeId: string;
  cours: { id: string; slug: string; title: string; description: string | null };
  state: ParcoursStepState;
  quizzes: { id: string; passingScore: number; bestPercent: number | null }[];
  ressourceProgress?: { completed: number; total: number };
};

// Une étape est "terminée" quand tous les quiz publiés de ses thématiques
// ont été réussis (meilleur score ≥ seuil du quiz). Sans quiz, elle ne peut
// jamais se terminer : c'est la condition même du parcours imposé.
export async function getParcoursProgress(
  parcoursWithEtapes: ParcoursWithProgress,
  userId: string | null
): Promise<ParcoursStep[]> {
  const allQuizIds = parcoursWithEtapes.etapes.flatMap((etape) =>
    etape.cours.thematiques.flatMap((t) => t.quiz.map((q) => q.id))
  );
  const scores = userId
    ? await getQuizScores(userId, allQuizIds)
    : new Map<string, QuizScore>();

  const steps: ParcoursStep[] = [];
  let previousComplete = true;

  for (const etape of parcoursWithEtapes.etapes) {
    const quizzes = etape.cours.thematiques.flatMap((t) => t.quiz);
    const quizSummaries = quizzes.map((q) => {
      const s = scores.get(q.id);
      const bestPercent = s ? (s.bestScore / s.bestTotal) * 100 : null;
      return { id: q.id, passingScore: q.passingScore, bestPercent };
    });

    const coursComplete =
      quizzes.length > 0 &&
      quizSummaries.every(
        (q) => q.bestPercent !== null && q.bestPercent >= q.passingScore
      );

    const state: ParcoursStepState = coursComplete
      ? "completed"
      : previousComplete
        ? "active"
        : "locked";

    let ressourceProgress: { completed: number; total: number } | undefined;
    if (state === "active" && userId) {
      const outline = await getCoursOutline(etape.cours.id);
      const ressourceIds = (outline?.thematiques ?? []).flatMap((t) =>
        t.ressources.map((r) => r.id)
      );
      const completedIds = await getCompletedRessourceIds(
        userId,
        ressourceIds
      );
      ressourceProgress = {
        completed: completedIds.size,
        total: ressourceIds.length,
      };
    }

    steps.push({
      etapeId: etape.id,
      cours: etape.cours,
      state,
      quizzes: quizSummaries,
      ressourceProgress,
    });

    previousComplete = coursComplete;
  }

  return steps;
}

export async function getCoursHorsParcours(parcoursId: string) {
  const usedRows = await db
    .select({ coursId: parcoursEtapes.coursId })
    .from(parcoursEtapes)
    .where(eq(parcoursEtapes.parcoursId, parcoursId));
  const usedIds = new Set(usedRows.map((r) => r.coursId));

  const all = await getAllCours();
  return all.filter((c) => !usedIds.has(c.id));
}
