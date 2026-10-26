import { and, eq, isNull, lte, or } from "drizzle-orm";

import type { ContentAccess } from "@/lib/content-access";
import { db } from "@/lib/db";
import {
  classCours,
  classMembers,
  classQuizUnlocks,
  classRessourceUnlocks,
  quiz,
  ressources,
  thematiques,
} from "@/lib/db/schema";

// Un élément n'est visible que s'il est publié, débloqué pour une classe de
// l'étudiant, et que son cours est toujours suivi par cette classe. Dans une
// classe terminée (ancien élève), seuls comptent les déblocages antérieurs à
// son départ, et ses cours ne sont visibles que s'il y garde quelque chose.
export async function getStudentAccess(userId: string): Promise<ContentAccess> {
  const activeMember = and(
    eq(classMembers.userId, userId),
    isNull(classMembers.leftAt)
  );
  const [memberships, coursRows, ressourceRows, quizRows] = await Promise.all([
    db
      .select({ classId: classMembers.classId })
      .from(classMembers)
      .where(activeMember)
      .limit(1),
    db
      .selectDistinct({ id: classCours.coursId })
      .from(classCours)
      .innerJoin(classMembers, eq(classMembers.classId, classCours.classId))
      .where(activeMember),
    db
      .selectDistinct({
        id: ressources.id,
        thematiqueId: ressources.thematiqueId,
        coursId: thematiques.coursId,
      })
      .from(classRessourceUnlocks)
      .innerJoin(
        classMembers,
        eq(classMembers.classId, classRessourceUnlocks.classId)
      )
      .innerJoin(ressources, eq(ressources.id, classRessourceUnlocks.ressourceId))
      .innerJoin(thematiques, eq(thematiques.id, ressources.thematiqueId))
      .innerJoin(
        classCours,
        and(
          eq(classCours.classId, classRessourceUnlocks.classId),
          eq(classCours.coursId, thematiques.coursId)
        )
      )
      .where(
        and(
          eq(classMembers.userId, userId),
          or(
            isNull(classMembers.leftAt),
            lte(classRessourceUnlocks.unlockedAt, classMembers.leftAt)
          ),
          eq(ressources.status, "published")
        )
      ),
    db
      .selectDistinct({
        id: quiz.id,
        thematiqueId: quiz.thematiqueId,
        coursId: thematiques.coursId,
      })
      .from(classQuizUnlocks)
      .innerJoin(classMembers, eq(classMembers.classId, classQuizUnlocks.classId))
      .innerJoin(quiz, eq(quiz.id, classQuizUnlocks.quizId))
      .innerJoin(thematiques, eq(thematiques.id, quiz.thematiqueId))
      .innerJoin(
        classCours,
        and(
          eq(classCours.classId, classQuizUnlocks.classId),
          eq(classCours.coursId, thematiques.coursId)
        )
      )
      .where(
        and(
          eq(classMembers.userId, userId),
          or(
            isNull(classMembers.leftAt),
            lte(classQuizUnlocks.unlockedAt, classMembers.leftAt)
          ),
          eq(quiz.status, "published")
        )
      ),
  ]);

  return {
    all: false,
    inAnyClass: memberships.length > 0,
    coursIds: new Set([
      ...coursRows.map((r) => r.id),
      ...ressourceRows.map((r) => r.coursId),
      ...quizRows.map((q) => q.coursId),
    ]),
    thematiqueIds: new Set([
      ...ressourceRows.map((r) => r.thematiqueId),
      ...quizRows.map((q) => q.thematiqueId),
    ]),
    ressourceIds: new Set(ressourceRows.map((r) => r.id)),
    quizIds: new Set(quizRows.map((q) => q.id)),
  };
}
