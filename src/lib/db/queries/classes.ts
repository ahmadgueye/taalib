import { and, asc, count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { classMembers, classes, profiles } from "@/lib/db/schema";

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
