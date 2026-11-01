import { asc, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { classes, classMembers, profiles } from "@/lib/db/schema";

// Admins et contributeurs : ceux qui ont accès au dashboard.
export async function getTeam() {
  return db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      role: profiles.role,
    })
    .from(profiles)
    .where(ne(profiles.role, "viewer"))
    .orderBy(asc(profiles.role), asc(profiles.email));
}

export type AccountRow = {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: Date;
  classes: { id: string; name: string; former: boolean }[];
};

// Tous les autres comptes, avec les classes où ils sont (ou ont été) inscrits.
export async function getAccounts(): Promise<AccountRow[]> {
  const accounts = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(eq(profiles.role, "viewer"))
    .orderBy(desc(profiles.createdAt));

  if (accounts.length === 0) return [];

  const memberships = await db
    .select({
      userId: classMembers.userId,
      id: classes.id,
      name: classes.name,
      leftAt: classMembers.leftAt,
    })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      inArray(
        classMembers.userId,
        accounts.map((a) => a.id)
      )
    )
    .orderBy(asc(classes.name));

  return accounts.map((a) => ({
    ...a,
    classes: memberships
      .filter((m) => m.userId === a.id)
      .map((m) => ({ id: m.id, name: m.name, former: m.leftAt !== null })),
  }));
}
