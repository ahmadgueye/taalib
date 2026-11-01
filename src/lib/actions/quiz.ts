"use server";

import { and, eq, inArray, max, notInArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireContributor } from "@/lib/auth/get-session";
import { setFlash } from "@/lib/actions/flash";
import { questionsSchema } from "@/lib/actions/quiz-questions.schema";
import { revalidateCoursTree } from "@/lib/actions/revalidate-tree";
import { db } from "@/lib/db";
import { getQuizWithQuestions } from "@/lib/db/queries/quiz";
import {
  quiz,
  quizChoix,
  quizExtraAttempts,
  quizQuestions,
} from "@/lib/db/schema";
import { toQuestionDrafts, type QuestionDraft } from "@/lib/quiz-drafts";

export type ActionState =
  { error?: string; success?: string; questions?: QuestionDraft[] } | undefined;

const quizSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis."),
  description: z.string().trim().optional(),
  thematiqueId: z.string().trim().min(1, "La thématique est requise."),
  status: z.enum(["draft", "published"]),
  passingScore: z.coerce.number().int().min(0).max(100),
  maxAttempts: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce
      .number()
      .int()
      .min(1, "Au moins 1 tentative.")
      .max(100, "100 tentatives au maximum.")
      .nullable()
  ),
  hideCorrections: z.preprocess((v) => v === "true", z.boolean()),
});

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Questions = z.infer<typeof questionsSchema>;

// Lit les infos et les questions envoyées par l'éditeur. Le quiz et ses
// questions s'enregistrent ensemble : un quiz n'existe jamais sans question.
function parseQuizForm(formData: FormData) {
  const meta = quizSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    thematiqueId: formData.get("thematiqueId"),
    status: formData.get("status"),
    passingScore: formData.get("passingScore"),
    maxAttempts: formData.get("maxAttempts"),
    hideCorrections: formData.get("hideCorrections"),
  });
  if (!meta.success) return { error: meta.error.issues[0].message };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("questionsJson") ?? "[]"));
  } catch {
    return { error: "Données invalides." };
  }
  const questions = questionsSchema.safeParse(raw);
  if (!questions.success) {
    const issue = questions.error.issues[0];
    const index = issue.path[0];
    return {
      error:
        typeof index === "number"
          ? `Question ${index + 1} : ${issue.message}`
          : issue.message,
    };
  }

  return { meta: meta.data, questions: questions.data };
}

// Met les questions du quiz à jour en place : une question ou un choix qui
// garde son id est modifié, pas recréé, si bien que les réponses déjà
// données par les élèves restent rattachées. Seul ce qui a été retiré de
// l'éditeur est supprimé (avec les réponses qui s'y rattachaient). Un score
// déjà obtenu n'est pas recalculé si une bonne réponse change.
async function syncQuestions(tx: Tx, quizId: string, questions: Questions) {
  const existing = await tx.query.quizQuestions.findMany({
    where: eq(quizQuestions.quizId, quizId),
    columns: { id: true },
    with: { choix: { columns: { id: true } } },
  });
  // Un id qui n'appartient pas à ce quiz est traité comme un nouvel élément.
  const existingChoix = new Map(
    existing.map((q) => [q.id, new Set(q.choix.map((c) => c.id))])
  );

  const keptQuestionIds = questions
    .map((q) => q.id)
    .filter((id): id is string => !!id && existingChoix.has(id));
  await tx
    .delete(quizQuestions)
    .where(
      keptQuestionIds.length > 0
        ? and(
            eq(quizQuestions.quizId, quizId),
            notInArray(quizQuestions.id, keptQuestionIds)
          )
        : eq(quizQuestions.quizId, quizId)
    );

  for (const [orderIndex, question] of questions.entries()) {
    const values = {
      orderIndex,
      prompt: question.prompt,
      type: question.type,
      explanation: question.explanation || null,
    };
    const choixOfQuestion =
      question.id !== undefined ? existingChoix.get(question.id) : undefined;

    let questionId: string;
    if (question.id && choixOfQuestion) {
      questionId = question.id;
      await tx
        .update(quizQuestions)
        .set(values)
        .where(eq(quizQuestions.id, questionId));
    } else {
      const [inserted] = await tx
        .insert(quizQuestions)
        .values({ quizId, ...values })
        .returning({ id: quizQuestions.id });
      questionId = inserted.id;
    }

    const known = choixOfQuestion ?? new Set<string>();
    const keptChoixIds = question.choix
      .map((c) => c.id)
      .filter((id): id is string => !!id && known.has(id));
    if (known.size > 0) {
      const removed = [...known].filter((id) => !keptChoixIds.includes(id));
      if (removed.length > 0) {
        await tx.delete(quizChoix).where(inArray(quizChoix.id, removed));
      }
    }

    for (const [choixIndex, choix] of question.choix.entries()) {
      const choixValues = {
        orderIndex: choixIndex,
        label: choix.label,
        isCorrect: choix.isCorrect,
      };
      if (choix.id && known.has(choix.id)) {
        await tx
          .update(quizChoix)
          .set(choixValues)
          .where(eq(quizChoix.id, choix.id));
      } else {
        await tx.insert(quizChoix).values({ questionId, ...choixValues });
      }
    }
  }
}

function revalidateQuiz(quizId: string) {
  revalidatePath(`/dashboard/quiz/${quizId}`);
  revalidatePath("/dashboard/quiz");
  revalidatePath("/thematiques");
  revalidateCoursTree();
}

export async function createQuiz(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireContributor();
  const parsed = parseQuizForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { meta, questions } = parsed;

  const quizId = await db.transaction(async (tx) => {
    // Un quiz ajouté se place en fin de thématique.
    const [{ last }] = await tx
      .select({ last: max(quiz.orderIndex) })
      .from(quiz)
      .where(eq(quiz.thematiqueId, meta.thematiqueId));
    const [created] = await tx
      .insert(quiz)
      .values({
        orderIndex: (last ?? -1) + 1,
        title: meta.title,
        description: meta.description || null,
        thematiqueId: meta.thematiqueId,
        status: meta.status,
        passingScore: meta.passingScore,
        maxAttempts: meta.maxAttempts,
        hideCorrections: meta.maxAttempts !== null && meta.hideCorrections,
        addedBy: profile.id,
      })
      .returning({ id: quiz.id });
    await syncQuestions(tx, created.id, questions);
    return created.id;
  });

  revalidateQuiz(quizId);
  await setFlash("Quiz créé.");
  redirect(`/dashboard/quiz/${quizId}`);
}

// L'éditeur reste ouvert après l'enregistrement : il reçoit les questions
// enregistrées, avec leurs ids, pour les enregistrements suivants.
export async function updateQuiz(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireContributor();
  const parsed = parseQuizForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { meta, questions } = parsed;

  await db.transaction(async (tx) => {
    await tx
      .update(quiz)
      .set({
        title: meta.title,
        description: meta.description || null,
        thematiqueId: meta.thematiqueId,
        status: meta.status,
        passingScore: meta.passingScore,
        maxAttempts: meta.maxAttempts,
        hideCorrections: meta.maxAttempts !== null && meta.hideCorrections,
        updatedAt: new Date(),
      })
      .where(eq(quiz.id, id));
    await syncQuestions(tx, id, questions);
  });

  revalidateQuiz(id);
  const saved = await getQuizWithQuestions(id);
  return {
    success: "Quiz enregistré.",
    questions: saved ? toQuestionDrafts(saved.questions) : undefined,
  };
}

export async function deleteQuiz(id: string) {
  await requireContributor();
  await db.delete(quiz).where(eq(quiz.id, id));
  revalidatePath("/dashboard/quiz");
  revalidatePath("/thematiques");
  revalidateCoursTree();
}

export async function reorderQuiz(
  thematiqueId: string,
  orderedIds: string[]
): Promise<{ error?: string } | undefined> {
  await requireContributor();

  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(quiz)
        .set({ orderIndex: index, updatedAt: new Date() })
        .where(and(eq(quiz.id, id), eq(quiz.thematiqueId, thematiqueId)))
    )
  );

  revalidateCoursTree();
  revalidatePath("/thematiques");
  return undefined;
}

// Une tentative de plus pour un étudiant qui a épuisé la limite du quiz.
export async function grantQuizAttempt(
  quizId: string,
  userId: string
): Promise<{ error?: string } | undefined> {
  const profile = await requireContributor();

  await db
    .insert(quizExtraAttempts)
    .values({ quizId, userId, extra: 1, grantedBy: profile.id })
    .onConflictDoUpdate({
      target: [quizExtraAttempts.quizId, quizExtraAttempts.userId],
      set: {
        extra: sql`${quizExtraAttempts.extra} + 1`,
        grantedBy: profile.id,
        updatedAt: new Date(),
      },
    });

  revalidatePath(`/dashboard/quiz/${quizId}/soumissions`);
  revalidatePath("/dashboard/classes/[id]", "page");
  revalidatePath("/dashboard/classes/[id]/etudiants/[userId]", "page");
  revalidatePath(`/quiz/${quizId}`);
  return undefined;
}
