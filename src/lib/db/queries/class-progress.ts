import { and, count, eq, inArray, max } from "drizzle-orm";

import { buildClassProgress } from "@/lib/class-progress";
import { db } from "@/lib/db";
import {
  classCours,
  classMembers,
  classQuizUnlocks,
  classRessourceUnlocks,
  profiles,
  quiz,
  quizExtraAttempts,
  quizTentatives,
  quranMemorization,
  ressourceProgress,
  ressources,
  thematiques,
} from "@/lib/db/schema";
import { getChapters } from "@/lib/quran/queries";

// Suivi des étudiants (actifs et anciens) d'une classe, pour la page de la
// classe dans le dashboard. Réservé à l'admin : l'appelant vérifie le rôle.
export async function getClassProgress(classId: string) {
  const members = await db
    .select({
      userId: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      leftAt: classMembers.leftAt,
    })
    .from(classMembers)
    .innerJoin(profiles, eq(profiles.id, classMembers.userId))
    .where(eq(classMembers.classId, classId));
  if (members.length === 0) return [];

  const userIds = members.map((m) => m.userId);
  // Seuls les éléments publiés des cours encore suivis par la classe
  // comptent, comme pour ce que voit l'étudiant.
  const [
    unlockedRessources,
    unlockedQuiz,
    completions,
    attempts,
    memorization,
    chapters,
    extraAttempts,
  ] =
    await Promise.all([
      db
        .select({
          id: classRessourceUnlocks.ressourceId,
          unlockedAt: classRessourceUnlocks.unlockedAt,
        })
        .from(classRessourceUnlocks)
        .innerJoin(ressources, eq(ressources.id, classRessourceUnlocks.ressourceId))
        .innerJoin(thematiques, eq(thematiques.id, ressources.thematiqueId))
        .innerJoin(
          classCours,
          and(
            eq(classCours.coursId, thematiques.coursId),
            eq(classCours.classId, classId)
          )
        )
        .where(
          and(
            eq(classRessourceUnlocks.classId, classId),
            eq(ressources.status, "published")
          )
        ),
      db
        .select({
          id: classQuizUnlocks.quizId,
          unlockedAt: classQuizUnlocks.unlockedAt,
          passingScore: quiz.passingScore,
          maxAttempts: quiz.maxAttempts,
        })
        .from(classQuizUnlocks)
        .innerJoin(quiz, eq(quiz.id, classQuizUnlocks.quizId))
        .innerJoin(thematiques, eq(thematiques.id, quiz.thematiqueId))
        .innerJoin(
          classCours,
          and(
            eq(classCours.coursId, thematiques.coursId),
            eq(classCours.classId, classId)
          )
        )
        .where(
          and(eq(classQuizUnlocks.classId, classId), eq(quiz.status, "published"))
        ),
      db
        .select({
          userId: ressourceProgress.userId,
          ressourceId: ressourceProgress.ressourceId,
          completedAt: ressourceProgress.completedAt,
        })
        .from(ressourceProgress)
        .where(inArray(ressourceProgress.userId, userIds)),
      db
        .select({
          userId: quizTentatives.userId,
          quizId: quizTentatives.quizId,
          score: quizTentatives.score,
          totalQuestions: quizTentatives.totalQuestions,
          completedAt: quizTentatives.completedAt,
        })
        .from(quizTentatives)
        .where(inArray(quizTentatives.userId, userIds)),
      db
        .select({
          userId: quranMemorization.userId,
          chapterId: quranMemorization.chapterId,
          status: quranMemorization.status,
          count: count(),
          lastUpdatedAt: max(quranMemorization.updatedAt),
        })
        .from(quranMemorization)
        .where(inArray(quranMemorization.userId, userIds))
        .groupBy(
          quranMemorization.userId,
          quranMemorization.chapterId,
          quranMemorization.status
        ),
      getChapters(),
      db
        .select({
          userId: quizExtraAttempts.userId,
          quizId: quizExtraAttempts.quizId,
          extra: quizExtraAttempts.extra,
        })
        .from(quizExtraAttempts)
        .where(inArray(quizExtraAttempts.userId, userIds)),
    ]);

  return buildClassProgress({
    members,
    ressources: unlockedRessources,
    quiz: unlockedQuiz,
    completions,
    attempts,
    extraAttempts,
    memorization: memorization.map((m) => ({
      ...m,
      lastUpdatedAt: new Date(m.lastUpdatedAt ?? 0),
    })),
    chapters,
  });
}

// Date de lecture de chaque ressource lue par l'étudiant, parmi celles
// demandées (détail d'un étudiant).
export async function getRessourceCompletionDates(
  userId: string,
  ressourceIds: string[]
) {
  if (ressourceIds.length === 0) return new Map<string, Date>();
  const rows = await db
    .select({
      ressourceId: ressourceProgress.ressourceId,
      completedAt: ressourceProgress.completedAt,
    })
    .from(ressourceProgress)
    .where(
      and(
        eq(ressourceProgress.userId, userId),
        inArray(ressourceProgress.ressourceId, ressourceIds)
      )
    );
  return new Map(rows.map((r) => [r.ressourceId, r.completedAt]));
}
