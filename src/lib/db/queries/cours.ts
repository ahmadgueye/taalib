import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { cours, quiz, ressources, thematiques } from "@/lib/db/schema";

export async function getAllCours() {
  return db.query.cours.findMany({
    orderBy: [asc(cours.title)],
  });
}

// Le catalogue pour le staff, avec ce que contient chaque cours : nombre de
// thématiques, de leçons et de quiz publiés.
export async function getAllCoursWithCounts() {
  const rows = await db.query.cours.findMany({
    orderBy: [asc(cours.title)],
    with: {
      thematiques: {
        columns: { id: true },
        with: {
          ressources: {
            where: eq(ressources.status, "published"),
            columns: { id: true },
          },
          quiz: {
            where: eq(quiz.status, "published"),
            columns: { id: true },
          },
        },
      },
    },
  });

  return rows.map(({ thematiques: ts, ...c }) => ({
    ...c,
    counts: {
      thematiques: ts.length,
      lessons: ts.reduce((n, t) => n + t.ressources.length, 0),
      quizzes: ts.reduce((n, t) => n + t.quiz.length, 0),
    },
  }));
}

export async function getCoursById(id: string) {
  const result = await db.query.cours.findFirst({
    where: eq(cours.id, id),
    with: {
      thematiques: {
        orderBy: [asc(thematiques.orderIndex), asc(thematiques.title)],
      },
    },
  });

  return result ?? null;
}

export async function getCoursBySlug(slug: string) {
  const result = await db.query.cours.findFirst({
    where: eq(cours.slug, slug),
    with: {
      thematiques: {
        orderBy: [asc(thematiques.orderIndex), asc(thematiques.title)],
      },
    },
  });

  return result ?? null;
}

export async function getCoursOutline(coursId: string) {
  const result = await db.query.cours.findFirst({
    where: eq(cours.id, coursId),
    with: {
      thematiques: {
        orderBy: [asc(thematiques.orderIndex), asc(thematiques.title)],
        with: {
          ressources: {
            where: eq(ressources.status, "published"),
            orderBy: [asc(ressources.orderIndex), asc(ressources.title)],
          },
        },
      },
    },
  });

  return result ?? null;
}
