import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { getAllThematiques } from "@/lib/db/queries/thematiques";
import { getCompletedRessourceIds } from "@/lib/db/queries/progress";
import { getQuizScores, type QuizScore } from "@/lib/db/queries/quiz-tentatives";
import { parcours, parcoursEtapes, quiz, ressources } from "@/lib/db/schema";

export async function getAllParcours() {
  return db.query.parcours.findMany({
    orderBy: [asc(parcours.createdAt)],
    with: {
      etapes: {
        orderBy: [asc(parcoursEtapes.orderIndex)],
        with: { thematique: { with: { cours: {} } } },
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
        with: { thematique: { with: { cours: {} } } },
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
        thematique: {
          with: {
            cours: {},
            quiz: { where: eq(quiz.status, "published") },
            ressources: {
              where: eq(ressources.status, "published"),
              orderBy: [asc(ressources.orderIndex)],
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
  thematique: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    cours: { id: string; slug: string; title: string };
  };
  state: ParcoursStepState;
  quizzes: { id: string; passingScore: number; bestPercent: number | null }[];
  ressourceProgress?: { completed: number; total: number };
};

// Une étape est "terminée" quand tous les quiz publiés de sa thématique
// ont été réussis (meilleur score ≥ seuil du quiz). Sans quiz, rien ne la
// bloque : elle est considérée terminée dès qu'elle devient active.
export async function getParcoursProgress(
  parcoursWithEtapes: ParcoursWithProgress,
  userId: string | null
): Promise<ParcoursStep[]> {
  const allQuizIds = parcoursWithEtapes.etapes.flatMap((etape) =>
    etape.thematique.quiz.map((q) => q.id)
  );
  const allRessourceIds = parcoursWithEtapes.etapes.flatMap((etape) =>
    etape.thematique.ressources.map((r) => r.id)
  );
  const [scores, completedIds] = await Promise.all([
    userId
      ? getQuizScores(userId, allQuizIds)
      : Promise.resolve(new Map<string, QuizScore>()),
    userId
      ? getCompletedRessourceIds(userId, allRessourceIds)
      : Promise.resolve(new Set<string>()),
  ]);

  const steps: ParcoursStep[] = [];
  let previousComplete = true;

  for (const etape of parcoursWithEtapes.etapes) {
    const quizzes = etape.thematique.quiz;
    const quizSummaries = quizzes.map((q) => {
      const s = scores.get(q.id);
      const bestPercent = s ? (s.bestScore / s.bestTotal) * 100 : null;
      return { id: q.id, passingScore: q.passingScore, bestPercent };
    });

    const thematiqueComplete =
      quizzes.length === 0 ||
      quizSummaries.every(
        (q) => q.bestPercent !== null && q.bestPercent >= q.passingScore
      );

    const state: ParcoursStepState = !previousComplete
      ? "locked"
      : thematiqueComplete
        ? "completed"
        : "active";

    let ressourceProgress: { completed: number; total: number } | undefined;
    if (state === "active" && userId) {
      const ids = etape.thematique.ressources.map((r) => r.id);
      ressourceProgress = {
        completed: ids.filter((id) => completedIds.has(id)).length,
        total: ids.length,
      };
    }

    steps.push({
      etapeId: etape.id,
      thematique: etape.thematique,
      state,
      quizzes: quizSummaries,
      ressourceProgress,
    });

    previousComplete = state === "completed";
  }

  return steps;
}

export async function getThematiquesHorsParcours(parcoursId: string) {
  const usedRows = await db
    .select({ thematiqueId: parcoursEtapes.thematiqueId })
    .from(parcoursEtapes)
    .where(eq(parcoursEtapes.parcoursId, parcoursId));
  const usedIds = new Set(usedRows.map((r) => r.thematiqueId));

  const all = await getAllThematiques();
  return all.filter((t) => !usedIds.has(t.id));
}
