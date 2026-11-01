"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireContributor } from "@/lib/auth/get-session";
import { setFlash } from "@/lib/actions/flash";
import { db } from "@/lib/db";
import { quiz, quizChoix, quizQuestions } from "@/lib/db/schema";
import { revalidateCoursTree } from "@/lib/actions/revalidate-tree";
import { questionsSchema } from "@/lib/actions/quiz-questions.schema";

export type ActionState = { error?: string } | undefined;

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
  revalidateCoursTree();

  // Retour à la thématique du quiz, où l'on gère tout son contenu.
  const saved = await db.query.quiz.findFirst({
    where: eq(quiz.id, quizId),
    columns: { thematiqueId: true },
  });
  await setFlash("Questions enregistrées.");
  redirect(
    saved ? `/dashboard/thematiques/${saved.thematiqueId}` : "/dashboard/quiz"
  );
}
