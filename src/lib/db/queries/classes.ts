import { and, asc, count, eq, isNull, notInArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  classCours,
  classMembers,
  classQuizUnlocks,
  classRessourceUnlocks,
  classes,
  cours,
  profiles,
  quiz,
  ressources,
  thematiques,
} from "@/lib/db/schema";

export async function getAllClasses() {
  return db
    .select({
      id: classes.id,
      name: classes.name,
      description: classes.description,
      inviteEnabled: classes.inviteEnabled,
      createdAt: classes.createdAt,
      memberCount: count(classMembers.userId),
    })
    .from(classes)
    // Seuls les membres actifs comptent, pas les anciens élèves.
    .leftJoin(
      classMembers,
      and(eq(classMembers.classId, classes.id), isNull(classMembers.leftAt))
    )
    .groupBy(classes.id)
    .orderBy(asc(classes.name));
}

export async function getClassById(id: string) {
  const result = await db.query.classes.findFirst({
    where: eq(classes.id, id),
  });
  return result ?? null;
}

export async function getClassMembers(classId: string) {
  return db
    .select({
      userId: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      joinedAt: classMembers.joinedAt,
      leftAt: classMembers.leftAt,
    })
    .from(classMembers)
    .innerJoin(profiles, eq(profiles.id, classMembers.userId))
    .where(eq(classMembers.classId, classId))
    .orderBy(asc(profiles.fullName), asc(profiles.email));
}

export async function getClassByInviteCode(code: string) {
  const result = await db.query.classes.findFirst({
    where: eq(classes.inviteCode, code),
  });
  return result ?? null;
}

// Membre actif : un ancien élève peut rejoindre de nouveau avec le code.
export async function isClassMember(classId: string, userId: string) {
  const [row] = await db
    .select({ userId: classMembers.userId })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.userId, userId),
        isNull(classMembers.leftAt)
      )
    )
    .limit(1);
  return Boolean(row);
}

// Cours de la classe, thématique par thématique, avec leurs ressources et
// quiz publiés annotés de leur date de déblocage pour cette classe (null =
// verrouillé).
export async function getClassCoursOutline(classId: string) {
  const [rows, ressourceUnlocks, quizUnlocks] = await Promise.all([
    db.query.classCours.findMany({
      where: eq(classCours.classId, classId),
      orderBy: [asc(classCours.orderIndex), asc(classCours.addedAt)],
      with: {
        cours: {
          with: {
            thematiques: {
              orderBy: [asc(thematiques.orderIndex), asc(thematiques.title)],
              with: {
                ressources: {
                  where: eq(ressources.status, "published"),
                  orderBy: [asc(ressources.orderIndex), asc(ressources.title)],
                },
                quiz: {
                  where: eq(quiz.status, "published"),
                  orderBy: [asc(quiz.orderIndex), asc(quiz.title)],
                },
              },
            },
          },
        },
      },
    }),
    db
      .select({
        id: classRessourceUnlocks.ressourceId,
        unlockedAt: classRessourceUnlocks.unlockedAt,
      })
      .from(classRessourceUnlocks)
      .where(eq(classRessourceUnlocks.classId, classId)),
    db
      .select({
        id: classQuizUnlocks.quizId,
        unlockedAt: classQuizUnlocks.unlockedAt,
      })
      .from(classQuizUnlocks)
      .where(eq(classQuizUnlocks.classId, classId)),
  ]);

  const ressourceUnlockedAt = new Map(
    ressourceUnlocks.map((u) => [u.id, u.unlockedAt])
  );
  const quizUnlockedAt = new Map(quizUnlocks.map((u) => [u.id, u.unlockedAt]));

  return rows
    .map((r) => ({
      id: r.cours.id,
      title: r.cours.title,
      thematiques: r.cours.thematiques.map((t) => ({
        id: t.id,
        title: t.title,
        ressources: t.ressources.map((res) => ({
          id: res.id,
          title: res.title,
          type: res.type,
          unlockedAt: ressourceUnlockedAt.get(res.id) ?? null,
        })),
        quiz: t.quiz.map((q) => ({
          id: q.id,
          title: q.title,
          passingScore: q.passingScore,
          unlockedAt: quizUnlockedAt.get(q.id) ?? null,
        })),
      })),
    }));
}

export type ClassCoursOutline = Awaited<
  ReturnType<typeof getClassCoursOutline>
>[number];

export async function getCoursNotInClass(classId: string) {
  const inClass = db
    .select({ id: classCours.coursId })
    .from(classCours)
    .where(eq(classCours.classId, classId));
  return db
    .select({ id: cours.id, title: cours.title })
    .from(cours)
    .where(notInArray(cours.id, inClass))
    .orderBy(asc(cours.title));
}
