import { asc, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { seances } from "@/lib/db/schema";

export async function getAllSeances() {
  return db.query.seances.findMany({
    orderBy: [desc(seances.sessionDate)],
  });
}

// Les ids rattachés servent à filtrer les séances selon l'accès de
// l'utilisateur (voir canSeeSeance dans lib/content-access.ts).
const linkedIds = {
  seanceThematiques: { columns: { thematiqueId: true } },
  seanceRessources: { columns: { ressourceId: true } },
} as const;

export async function getUpcomingSeances(limit?: number) {
  return db.query.seances.findMany({
    where: gte(seances.sessionDate, sql`CURRENT_DATE`),
    orderBy: [asc(seances.sessionDate)],
    limit,
    with: linkedIds,
  });
}

export async function getPastSeances(limit?: number) {
  return db.query.seances.findMany({
    where: or(lt(seances.sessionDate, sql`CURRENT_DATE`), isNull(seances.sessionDate)),
    orderBy: [sql`${seances.sessionDate} DESC NULLS LAST`],
    limit,
    with: linkedIds,
  });
}

export async function getRecentSeances(limit: number) {
  return db.query.seances.findMany({
    orderBy: [desc(seances.createdAt)],
    limit,
  });
}

export async function getSeanceById(id: string) {
  const result = await db.query.seances.findFirst({
    where: eq(seances.id, id),
    with: {
      seanceThematiques: true,
      seanceRessources: true,
    },
  });

  return result ?? null;
}

export async function getSeanceBySlug(slug: string) {
  const result = await db.query.seances.findFirst({
    where: eq(seances.slug, slug),
    with: {
      seanceThematiques: {
        with: { thematique: { with: { cours: true } } },
      },
      seanceRessources: {
        with: { ressource: true },
      },
    },
  });

  return result ?? null;
}
