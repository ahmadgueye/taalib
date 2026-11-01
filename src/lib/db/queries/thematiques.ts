import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { hadiths, quiz, ressources, thematiques } from "@/lib/db/schema";

export async function getAllThematiques() {
  return db.query.thematiques.findMany({
    orderBy: [asc(thematiques.title)],
    with: { cours: true },
  });
}

export async function getThematiqueById(id: string) {
  const result = await db.query.thematiques.findFirst({
    where: eq(thematiques.id, id),
    with: {
      ressources: {
        orderBy: [asc(ressources.orderIndex), asc(ressources.title)],
      },
    },
  });

  return result ?? null;
}

export async function getThematiqueBySlug(slug: string) {
  const result = await db.query.thematiques.findFirst({
    where: eq(thematiques.slug, slug),
    with: {
      cours: true,
      ressources: {
        where: eq(ressources.status, "published"),
        orderBy: [asc(ressources.orderIndex)],
      },
      hadiths: true,
      quiz: {
        where: eq(quiz.status, "published"),
        orderBy: [asc(quiz.orderIndex)],
        with: { questions: { columns: { id: true } } },
      },
    },
  });

  return result ?? null;
}

// Une thématique et tout ce qu'elle contient pour le dashboard, brouillons
// compris : ressources et quiz dans leur ordre d'affichage, hadiths.
export async function getThematiqueTree(id: string) {
  const result = await db.query.thematiques.findFirst({
    where: eq(thematiques.id, id),
    with: {
      cours: { columns: { id: true, title: true } },
      ressources: {
        orderBy: [asc(ressources.orderIndex), asc(ressources.title)],
      },
      quiz: {
        orderBy: [asc(quiz.orderIndex), asc(quiz.title)],
        with: { questions: { columns: { id: true } } },
      },
      hadiths: {
        orderBy: [asc(hadiths.title)],
        columns: { id: true, title: true },
      },
    },
  });

  return result ?? null;
}
