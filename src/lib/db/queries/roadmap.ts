import { asc, eq, inArray } from "drizzle-orm";

import { canSeeThematique, type ContentAccess } from "@/lib/content-access";
import { db } from "@/lib/db";
import { getCompletedRessourceIds } from "@/lib/db/queries/progress";
import { getQuizScores } from "@/lib/db/queries/quiz-tentatives";
import {
  classCours,
  classMembers,
  cours,
  quiz,
  ressources,
  thematiques,
} from "@/lib/db/schema";

// "upcoming" : rien de la thématique n'est encore débloqué pour la classe.
export type RoadmapStepState = "completed" | "active" | "upcoming";

export type RoadmapStep = {
  thematique: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
  };
  state: RoadmapStepState;
  // Toutes les leçons publiées de la thématique, débloquées ou non :
  // l'étudiant voit ce qu'il a fait et ce qui lui reste.
  ressourceProgress: { completed: number; total: number };
};

export type RoadmapCours = {
  id: string;
  slug: string;
  title: string;
  steps: RoadmapStep[];
};

// Feuille de route d'un étudiant, générée à partir de ses classes : leurs
// cours dans l'ordre choisi sur la page de la classe, puis les thématiques de
// chaque cours dans l'ordre du dashboard.
//
// Une étape est « terminée » quand tout son contenu publié est débloqué, que
// toutes ses leçons sont lues et tous ses quiz réussis (meilleur score ≥
// seuil) ; « en cours » dès qu'un élément est débloqué ; « à venir » sinon.
export async function getStudentRoadmap(
  userId: string,
  access: ContentAccess
): Promise<RoadmapCours[]> {
  const rows = await db
    .select({ coursId: classCours.coursId })
    .from(classCours)
    .innerJoin(classMembers, eq(classMembers.classId, classCours.classId))
    .where(eq(classMembers.userId, userId))
    .orderBy(asc(classMembers.joinedAt), asc(classCours.orderIndex));
  // Un cours suivi par deux classes de l'étudiant n'apparaît qu'une fois.
  const coursIds = [...new Set(rows.map((r) => r.coursId))];
  if (coursIds.length === 0) return [];

  const coursList = await db.query.cours.findMany({
    where: inArray(cours.id, coursIds),
    with: {
      thematiques: {
        orderBy: [asc(thematiques.orderIndex), asc(thematiques.title)],
        with: {
          ressources: {
            where: eq(ressources.status, "published"),
            columns: { id: true },
          },
          quiz: {
            where: eq(quiz.status, "published"),
            columns: { id: true, passingScore: true },
          },
        },
      },
    },
  });

  const allThematiques = coursList.flatMap((c) => c.thematiques);
  const [completedIds, scores] = await Promise.all([
    getCompletedRessourceIds(
      userId,
      allThematiques.flatMap((t) => t.ressources.map((r) => r.id))
    ),
    getQuizScores(
      userId,
      allThematiques.flatMap((t) => t.quiz.map((q) => q.id))
    ),
  ]);

  function stepFor(t: (typeof allThematiques)[number]): RoadmapStep {
    const completed = t.ressources.filter((r) => completedIds.has(r.id)).length;
    const allUnlocked =
      t.ressources.every((r) => access.all || access.ressourceIds.has(r.id)) &&
      t.quiz.every((q) => access.all || access.quizIds.has(q.id));
    const quizzesPassed = t.quiz.every((q) => {
      const s = scores.get(q.id);
      return s !== undefined && (s.bestScore / s.bestTotal) * 100 >= q.passingScore;
    });

    const state: RoadmapStepState = !canSeeThematique(access, t.id)
      ? "upcoming"
      : allUnlocked && completed === t.ressources.length && quizzesPassed
        ? "completed"
        : "active";

    return {
      thematique: {
        id: t.id,
        slug: t.slug,
        title: t.title,
        description: t.description,
      },
      state,
      ressourceProgress: { completed, total: t.ressources.length },
    };
  }

  const byId = new Map(coursList.map((c) => [c.id, c]));
  return coursIds
    .map((id) => byId.get(id))
    .filter((c) => c !== undefined)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      steps: c.thematiques.map(stepFor),
    }));
}
