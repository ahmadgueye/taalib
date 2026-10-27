"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireContributor } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { cours } from "@/lib/db/schema";
import { slugify } from "@/lib/utils";

export type ActionState = { error?: string } | undefined;

const coursSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis."),
  arabicTitle: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: z.enum(["published", "coming_soon"]),
});

export async function createCours(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireContributor();
  const parsed = coursSchema.safeParse({
    title: formData.get("title"),
    arabicTitle: formData.get("arabicTitle") ?? undefined,
    description: formData.get("description"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await db.insert(cours).values({
      title: parsed.data.title,
      arabicTitle: parsed.data.arabicTitle || null,
      description: parsed.data.description || null,
      status: parsed.data.status,
      slug: slugify(parsed.data.title),
      createdBy: profile.id,
    });
  } catch {
    return { error: "Un cours avec ce titre existe déjà." };
  }

  revalidatePath("/dashboard/cours");
  revalidatePath("/cours");
  revalidatePath("/");
  redirect("/dashboard/cours");
}

export async function updateCours(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireContributor();
  const parsed = coursSchema.safeParse({
    title: formData.get("title"),
    arabicTitle: formData.get("arabicTitle") ?? undefined,
    description: formData.get("description"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await db
      .update(cours)
      .set({
        title: parsed.data.title,
        arabicTitle: parsed.data.arabicTitle || null,
        description: parsed.data.description || null,
        status: parsed.data.status,
        slug: slugify(parsed.data.title),
        updatedAt: new Date(),
      })
      .where(eq(cours.id, id));
  } catch {
    return { error: "Un cours avec ce titre existe déjà." };
  }

  revalidatePath("/dashboard/cours");
  revalidatePath("/cours");
  revalidatePath("/");
  redirect("/dashboard/cours");
}

export async function deleteCours(id: string) {
  await requireContributor();
  await db.delete(cours).where(eq(cours.id, id));
  revalidatePath("/dashboard/cours");
  revalidatePath("/cours");
  revalidatePath("/");
}
