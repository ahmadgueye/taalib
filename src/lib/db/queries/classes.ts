import { and, asc, count, eq, notInArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  classCours,
  classMembers,
  classUnlocks,
  classes,
  cours,
  profiles,
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
    .leftJoin(classMembers, eq(classMembers.classId, classes.id))
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

export async function isClassMember(classId: string, userId: string) {
  const [row] = await db
    .select({ userId: classMembers.userId })
    .from(classMembers)
    .where(
      and(eq(classMembers.classId, classId), eq(classMembers.userId, userId))
    )
    .limit(1);
  return Boolean(row);
}

// Cours de la classe avec leurs thématiques, chacune annotée de sa date de
// déblocage pour cette classe (null = verrouillée).
export async function getClassCoursOutline(classId: string) {
  const [rows, unlocks] = await Promise.all([
    db.query.classCours.findMany({
      where: eq(classCours.classId, classId),
      with: {
        cours: {
          with: {
            thematiques: {
              orderBy: [asc(thematiques.orderIndex), asc(thematiques.title)],
            },
          },
        },
      },
    }),
    db
      .select({
        thematiqueId: classUnlocks.thematiqueId,
        unlockedAt: classUnlocks.unlockedAt,
      })
      .from(classUnlocks)
      .where(eq(classUnlocks.classId, classId)),
  ]);

  const unlockedAt = new Map(unlocks.map((u) => [u.thematiqueId, u.unlockedAt]));

  return rows
    .map((r) => ({
      id: r.cours.id,
      title: r.cours.title,
      thematiques: r.cours.thematiques.map((t) => ({
        id: t.id,
        title: t.title,
        unlockedAt: unlockedAt.get(t.id) ?? null,
      })),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

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
