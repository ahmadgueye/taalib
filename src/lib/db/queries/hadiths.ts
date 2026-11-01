import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { hadithNarrators, hadiths } from "@/lib/db/schema";

// Rapporteurs d'un hadith dans l'ordre de saisie.
export const withNarrators = {
  hadithNarrators: {
    orderBy: asc(hadithNarrators.orderIndex),
    with: { narrator: true as const },
  },
};

export async function getAllHadiths() {
  return db.query.hadiths.findMany({
    orderBy: [asc(hadiths.title)],
    with: { thematique: { with: { cours: true } }, ...withNarrators },
  });
}

export async function getRecentHadiths(limit: number) {
  return db.query.hadiths.findMany({
    orderBy: [desc(hadiths.createdAt)],
    limit,
    with: { thematique: { with: { cours: true } }, ...withNarrators },
  });
}

export async function getHadithById(id: string) {
  const result = await db.query.hadiths.findFirst({
    where: eq(hadiths.id, id),
    with: withNarrators,
  });

  return result ?? null;
}

export async function getHadithBySlug(slug: string) {
  const result = await db.query.hadiths.findFirst({
    where: eq(hadiths.slug, slug),
    with: {
      thematique: { with: { cours: true } },
      ...withNarrators,
    },
  });

  return result ?? null;
}
