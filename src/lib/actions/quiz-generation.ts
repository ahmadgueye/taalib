"use server";

import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { requireContributor } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { ressources } from "@/lib/db/schema";
import {
  generateQuestions,
  isQuizGenerationEnabled,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  type GenerationResult,
} from "@/lib/quiz-generation";

function textLessons(thematiqueId: string) {
  return and(
    eq(ressources.thematiqueId, thematiqueId),
    eq(ressources.type, "texte"),
    isNotNull(ressources.content)
  );
}

// Les leçons écrites de la thématique, que l'on peut donner au modèle.
export async function listQuizSources(thematiqueId: string) {
  await requireContributor();
  const rows = await db
    .select({
      id: ressources.id,
      title: ressources.title,
      content: ressources.content,
    })
    .from(ressources)
    .where(textLessons(thematiqueId))
    .orderBy(asc(ressources.orderIndex));
  return rows
    .filter((r) => r.content?.trim())
    .map((r) => ({
      id: r.id,
      title: r.title,
      words: r.content!.trim().split(/\s+/).length,
    }));
}

const generateSchema = z.object({
  thematiqueId: z.string().uuid(),
  ressourceIds: z
    .array(z.string().uuid())
    .min(1, "Choisis au moins une leçon."),
  count: z.number().int().min(MIN_QUESTIONS).max(MAX_QUESTIONS),
  instructions: z.string().max(500, "Consigne trop longue.").default(""),
});

export async function generateQuizQuestions(
  input: z.input<typeof generateSchema>
): Promise<GenerationResult> {
  await requireContributor();
  if (!isQuizGenerationEnabled()) {
    return { error: "La génération par IA n'est pas configurée." };
  }
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { thematiqueId, ressourceIds, count, instructions } = parsed.data;

  const lessons = await db
    .select({ title: ressources.title, content: ressources.content })
    .from(ressources)
    .where(and(textLessons(thematiqueId), inArray(ressources.id, ressourceIds)))
    .orderBy(asc(ressources.orderIndex));

  return generateQuestions({
    lessons: lessons.map((l) => ({ title: l.title, content: l.content ?? "" })),
    count,
    instructions,
  });
}
