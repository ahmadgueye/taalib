import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { quiz, ressources } from "@/lib/db/schema";

export async function getAllRessources() {
  return db.query.ressources.findMany({
    orderBy: [asc(ressources.title)],
    with: { thematique: { with: { cours: true } } },
  });
}

export async function getRecentRessources(limit: number) {
  return db.query.ressources.findMany({
    orderBy: [desc(ressources.createdAt)],
    limit,
    with: { thematique: { with: { cours: true } } },
  });
}

export async function getRessourceById(id: string) {
  const result = await db.query.ressources.findFirst({
    where: eq(ressources.id, id),
  });

  return result ?? null;
}

export async function getPublishedRessourceById(id: string) {
  const result = await db.query.ressources.findFirst({
    where: and(eq(ressources.id, id), eq(ressources.status, "published")),
    with: {
      thematique: {
        with: {
          cours: true,
          ressources: {
            where: eq(ressources.status, "published"),
            orderBy: [asc(ressources.orderIndex)],
          },
          quiz: {
            where: eq(quiz.status, "published"),
            orderBy: [asc(quiz.orderIndex)],
          },
        },
      },
    },
  });

  return result ?? null;
}
