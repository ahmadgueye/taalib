"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireContributor } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { quiz } from "@/lib/db/schema";

export type ActionState = { error?: string } | undefined;

const quizSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis."),
  description: z.string().trim().optional(),
  thematiqueId: z.string().trim().min(1, "La thématique est requise."),
  status: z.enum(["draft", "published"]),
});

export async function createQuiz(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireContributor();
  const parsed = quizSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    thematiqueId: formData.get("thematiqueId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [created] = await db
    .insert(quiz)
    .values({
      title: parsed.data.title,
      description: parsed.data.description || null,
      thematiqueId: parsed.data.thematiqueId,
      status: parsed.data.status,
      addedBy: profile.id,
    })
    .returning({ id: quiz.id });

  revalidatePath("/dashboard/quiz");
  revalidatePath("/thematiques");
  redirect(`/dashboard/quiz/${created.id}/questions`);
}

export async function updateQuiz(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireContributor();
  const parsed = quizSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    thematiqueId: formData.get("thematiqueId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await db
    .update(quiz)
    .set({
      title: parsed.data.title,
      description: parsed.data.description || null,
      thematiqueId: parsed.data.thematiqueId,
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(eq(quiz.id, id));

  revalidatePath("/dashboard/quiz");
  revalidatePath("/thematiques");
  redirect("/dashboard/quiz");
}

export async function deleteQuiz(id: string) {
  await requireContributor();
  await db.delete(quiz).where(eq(quiz.id, id));
  revalidatePath("/dashboard/quiz");
  revalidatePath("/thematiques");
}
