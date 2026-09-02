"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireContributor } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { quizChoix, quizQuestions } from "@/lib/db/schema";

export type ActionState = { error?: string } | undefined;

const choixSchema = z.object({
  label: z.string().trim().min(1, "Chaque choix doit avoir un intitulé."),
  isCorrect: z.boolean(),
});

const questionSchema = z
  .object({
    prompt: z.string().trim().min(1, "Chaque question doit avoir un énoncé."),
    type: z.enum(["qcm", "vrai_faux"]),
    explanation: z.string().trim().optional(),
    choix: z
      .array(choixSchema)
      .min(2, "Chaque question doit avoir au moins 2 choix."),
  })
  .refine((q) => q.choix.some((c) => c.isCorrect), {
    message: "Chaque question doit avoir au moins une bonne réponse.",
  })
  .refine(
    (q) =>
      q.type !== "vrai_faux" ||
      q.choix.filter((c) => c.isCorrect).length === 1,
    {
      message: "Une question Vrai/Faux doit avoir exactement une bonne réponse.",
    }
  );

const questionsSchema = z
  .array(questionSchema)
  .min(1, "Ajoutez au moins une question.");

export async function saveQuizQuestions(
  quizId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireContributor();

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("questionsJson") ?? "[]"));
  } catch {
    return { error: "Données invalides." };
  }

  const parsed = questionsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Remplacement transactionnel complet : supprime toutes les questions
  // existantes du quiz (cascade sur quiz_choix) et réinsère l'état soumis
  // par le builder. Plus simple qu'un diff/upsert question par question,
  // au prix de perdre le détail des réponses déjà soumises pour d'anciennes
  // tentatives (quiz_reponses cascade avec les choix supprimés) — le
  // score/total de ces tentatives reste correct, seul l'écran de
  // correction détaillé n'est plus disponible pour elles après une
  // modification du quiz.
  await db.transaction(async (tx) => {
    await tx.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));

    for (const [questionIndex, question] of parsed.data.entries()) {
      const [insertedQuestion] = await tx
        .insert(quizQuestions)
        .values({
          quizId,
          orderIndex: questionIndex,
          prompt: question.prompt,
          type: question.type,
          explanation: question.explanation || null,
        })
        .returning({ id: quizQuestions.id });

      await tx.insert(quizChoix).values(
        question.choix.map((choix, choixIndex) => ({
          questionId: insertedQuestion.id,
          orderIndex: choixIndex,
          label: choix.label,
          isCorrect: choix.isCorrect,
        }))
      );
    }
  });

  revalidatePath(`/dashboard/quiz/${quizId}/questions`);
  revalidatePath("/dashboard/quiz");
  revalidatePath("/thematiques");
  redirect("/dashboard/quiz");
}
