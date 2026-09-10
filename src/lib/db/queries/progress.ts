import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { getCoursOutline } from "@/lib/db/queries/cours";
import { ressourceProgress } from "@/lib/db/schema";

export async function getCompletedRessourceIds(
  userId: string,
  ressourceIds: string[]
) {
  if (ressourceIds.length === 0) return new Set<string>();

  const rows = await db
    .select({ ressourceId: ressourceProgress.ressourceId })
    .from(ressourceProgress)
    .where(
      and(
        eq(ressourceProgress.userId, userId),
        inArray(ressourceProgress.ressourceId, ressourceIds)
      )
    );

  return new Set(rows.map((row) => row.ressourceId));
}

export async function getSuiviCours(userId: string) {
  const rows = await db.query.ressourceProgress.findMany({
    where: eq(ressourceProgress.userId, userId),
    with: {
      ressource: { with: { thematique: { with: { cours: true } } } },
    },
  });

  const byCoursId = new Map<
    string,
    {
      cours: (typeof rows)[number]["ressource"]["thematique"]["cours"];
      completedIds: Set<string>;
    }
  >();
  for (const row of rows) {
    const c = row.ressource.thematique.cours;
    if (!byCoursId.has(c.id)) {
      byCoursId.set(c.id, { cours: c, completedIds: new Set() });
    }
    byCoursId.get(c.id)!.completedIds.add(row.ressourceId);
  }

  const results = await Promise.all(
    Array.from(byCoursId.values()).map(async ({ cours, completedIds }) => {
      const outline = await getCoursOutline(cours.id);
      const totalRessources = (outline?.thematiques ?? []).flatMap(
        (t) => t.ressources
      ).length;
      return {
        cours,
        completedCount: completedIds.size,
        totalRessources,
        progress:
          totalRessources > 0
            ? (completedIds.size / totalRessources) * 100
            : 0,
      };
    })
  );

  return results.sort((a, b) => a.cours.title.localeCompare(b.cours.title));
}
