"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireContributor } from "@/lib/auth/get-session";
import { setFlash } from "@/lib/actions/flash";
import { revalidateCoursTree } from "@/lib/actions/revalidate-tree";
import { db } from "@/lib/db";
import { thematiques } from "@/lib/db/schema";
import { slugify } from "@/lib/utils";

export type ActionState = { error?: string } | undefined;

const thematiqueSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis."),
  description: z.string().trim().optional(),
  coursId: z.string().trim().min(1, "Le cours est requis."),
});

export async function createThematique(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireContributor();
  const parsed = thematiqueSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    coursId: formData.get("coursId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Une thématique ajoutée se place en fin de cours.
  const [{ last }] = await db
    .select({ last: max(thematiques.orderIndex) })
    .from(thematiques)
    .where(eq(thematiques.coursId, parsed.data.coursId));

  let createdId: string;
  try {
    const [created] = await db
      .insert(thematiques)
      .values({
        title: parsed.data.title,
        description: parsed.data.description || null,
        coursId: parsed.data.coursId,
        orderIndex: (last ?? -1) + 1,
        slug: slugify(parsed.data.title),
        createdBy: profile.id,
      })
      .returning({ id: thematiques.id });
    createdId = created.id;
  } catch {
    return { error: "Une thématique avec ce titre existe déjà." };
  }

  revalidatePath("/dashboard/thematiques");
  revalidatePath("/cours");
  revalidateCoursTree();
  await setFlash("Thématique créée.");
  redirect(`/dashboard/thematiques/${createdId}`);
}

export async function updateThematique(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireContributor();
  const parsed = thematiqueSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    coursId: formData.get("coursId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await db
      .update(thematiques)
      .set({
        title: parsed.data.title,
        description: parsed.data.description || null,
        coursId: parsed.data.coursId,
        slug: slugify(parsed.data.title),
        updatedAt: new Date(),
      })
      .where(eq(thematiques.id, id));
  } catch {
    return { error: "Une thématique avec ce titre existe déjà." };
  }

  revalidatePath("/dashboard/thematiques");
  revalidatePath("/cours");
  revalidateCoursTree();
  await setFlash("Thématique enregistrée.");
  redirect(`/dashboard/thematiques/${id}`);
}

export async function deleteThematique(id: string) {
  await requireContributor();
  await db.delete(thematiques).where(eq(thematiques.id, id));
  revalidatePath("/dashboard/thematiques");
  revalidatePath("/cours");
  revalidateCoursTree();
}

export async function reorderThematiques(
  coursId: string,
  orderedIds: string[]
): Promise<{ error?: string } | undefined> {
  await requireContributor();

  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(thematiques)
        .set({ orderIndex: index, updatedAt: new Date() })
        .where(and(eq(thematiques.id, id), eq(thematiques.coursId, coursId)))
    )
  );

  revalidatePath("/dashboard/cours");
  revalidatePath("/cours");
  revalidateCoursTree();
  return undefined;
}
