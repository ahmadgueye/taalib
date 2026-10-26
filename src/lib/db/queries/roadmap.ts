import { asc, eq, inArray } from "drizzle-orm";

import { canSeeThematique, type ContentAccess } from "@/lib/content-access";
import { db } from "@/lib/db";
import { getUnlockDates } from "@/lib/db/queries/content-access";
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

// Un élément débloqué depuis moins longtemps, et pas encore fait, est
// signalé « Nouveau » : l'enseignant ouvre en général une ressource par
// semaine.
export const NEW_FOR_DAYS = 7;

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
  // Leçons et quiz récemment débloqués et pas encore faits.
  newCount: number;
};

export type RoadmapCours = {
  id: string;
  slug: string;
  title: string;
  steps: RoadmapStep[];
};

// Ce que l'étudiant a à faire maintenant dans un cours : la première leçon
// débloquée et non lue, ou à défaut le premier quiz débloqué et non réussi,
// en suivant la feuille de route.
export type RoadmapNext = {
  kind: "ressource" | "quiz";
  id: string;
  title: string;
  coursTitle: string;
  thematiqueTitle: string;
  isNew: boolean;
};

export type StudentRoadmap = {
  cours: RoadmapCours[];
  // Un élément par cours qui a encore quelque chose d'ouvert à faire (deux
  // cours peuvent avancer en parallèle) ; vide si tout est fait.
  todo: RoadmapNext[];
};

// Feuille de route d'un étudiant, générée à partir de ses classes : leurs
// cours dans l'ordre choisi sur la page de la classe, puis les thématiques de
// chaque cours dans l'ordre du dashboard.
//
// Une étape est « terminée » quand tout son contenu publié est débloqué, que
// toutes ses leçons sont lues et tous ses quiz réussis (meilleur score ≥
// seuil) ; « en cours » dès qu'un élément est débloqué ; « à venir » sinon.
// Un cours qui ne vient que de classes terminées (ancien élève) n'a plus rien
// à venir : il ne garde que ses étapes débloquées, et disparaît s'il n'en a
// aucune.
export async function getStudentRoadmap(
  userId: string,
  access: ContentAccess,
  now = new Date()
): Promise<StudentRoadmap> {
  const rows = await db
    .select({ coursId: classCours.coursId, leftAt: classMembers.leftAt })
    .from(classCours)
    .innerJoin(classMembers, eq(classMembers.classId, classCours.classId))
    .where(eq(classMembers.userId, userId))
    .orderBy(asc(classMembers.joinedAt), asc(classCours.orderIndex));
  // Un cours suivi par deux classes de l'étudiant n'apparaît qu'une fois.
  const coursIds = [...new Set(rows.map((r) => r.coursId))];
  if (coursIds.length === 0) return { cours: [], todo: [] };
  const activeCoursIds = new Set(
    rows.filter((r) => r.leftAt === null).map((r) => r.coursId)
  );

  const coursList = await db.query.cours.findMany({
    where: inArray(cours.id, coursIds),
    with: {
      thematiques: {
        orderBy: [asc(thematiques.orderIndex), asc(thematiques.title)],
        with: {
          ressources: {
            where: eq(ressources.status, "published"),
            orderBy: [asc(ressources.orderIndex), asc(ressources.title)],
            columns: { id: true, title: true },
          },
          quiz: {
            where: eq(quiz.status, "published"),
            orderBy: [asc(quiz.createdAt)],
            columns: { id: true, title: true, passingScore: true },
          },
        },
      },
    },
  });

  const allThematiques = coursList.flatMap((c) => c.thematiques);
  const [completedIds, scores, unlockDates] = await Promise.all([
    getCompletedRessourceIds(
      userId,
      allThematiques.flatMap((t) => t.ressources.map((r) => r.id))
    ),
    getQuizScores(
      userId,
      allThematiques.flatMap((t) => t.quiz.map((q) => q.id))
    ),
    getUnlockDates(userId),
  ]);

  const canSee = (id: string) =>
    access.all || access.ressourceIds.has(id) || access.quizIds.has(id);
  const isPassed = (q: { id: string; passingScore: number }) => {
    const s = scores.get(q.id);
    return s !== undefined && (s.bestScore / s.bestTotal) * 100 >= q.passingScore;
  };
  const newSince = now.getTime() - NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
  const isRecent = (id: string) =>
    (unlockDates.get(id)?.getTime() ?? 0) > newSince;

  function stepFor(t: (typeof allThematiques)[number]): RoadmapStep {
    const completed = t.ressources.filter((r) => completedIds.has(r.id)).length;
    const allUnlocked =
      t.ressources.every((r) => canSee(r.id)) && t.quiz.every((q) => canSee(q.id));
    const quizzesPassed = t.quiz.every(isPassed);

    const state: RoadmapStepState = !canSeeThematique(access, t.id)
      ? "upcoming"
      : allUnlocked && completed === t.ressources.length && quizzesPassed
        ? "completed"
        : "active";

    const newCount =
      t.ressources.filter((r) => isRecent(r.id) && !completedIds.has(r.id))
        .length + t.quiz.filter((q) => isRecent(q.id) && !isPassed(q)).length;

    return {
      thematique: {
        id: t.id,
        slug: t.slug,
        title: t.title,
        description: t.description,
      },
      state,
      ressourceProgress: { completed, total: t.ressources.length },
      newCount,
    };
  }

  const byId = new Map(coursList.map((c) => [c.id, c]));
  const ordered = coursIds
    .map((id) => byId.get(id))
    .filter((c) => c !== undefined);

  const todo: RoadmapNext[] = [];
  for (const c of ordered) {
    for (const t of c.thematiques) {
      const ressource = t.ressources.find(
        (r) => canSee(r.id) && !completedIds.has(r.id)
      );
      const exam = ressource
        ? undefined
        : t.quiz.find((q) => canSee(q.id) && !isPassed(q));
      const item = ressource ?? exam;
      if (item) {
        todo.push({
          kind: ressource ? "ressource" : "quiz",
          id: item.id,
          title: item.title,
          coursTitle: c.title,
          thematiqueTitle: t.title,
          isNew: isRecent(item.id),
        });
        break;
      }
    }
  }

  return {
    cours: ordered
      .map((c) => {
        const steps = c.thematiques.map(stepFor);
        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          steps: activeCoursIds.has(c.id)
            ? steps
            : steps.filter((s) => s.state !== "upcoming"),
        };
      })
      .filter((c) => activeCoursIds.has(c.id) || c.steps.length > 0),
    todo,
  };
}
