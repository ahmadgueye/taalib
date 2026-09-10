"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireContributor } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { parcours, parcoursEtapes } from "@/lib/db/schema";
import { slugify } from "@/lib/utils";

export type ActionState = { error?: string } | undefined;

const parcoursSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis."),
  description: z.string().trim().optional(),
});

export async function createParcours(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireContributor();
  const parsed = parcoursSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  let created;
  try {
    [created] = await db
      .insert(parcours)
      .values({
        title: parsed.data.title,
        description: parsed.data.description || null,
        slug: slugify(parsed.data.title),
        createdBy: profile.id,
      })
      .returning({ id: parcours.id });
  } catch {
    return { error: "Un parcours avec ce titre existe déjà." };
  }

  revalidatePath("/dashboard/parcours");
  revalidatePath("/");
  redirect(`/dashboard/parcours/${created.id}/edit`);
}

export async function updateParcours(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireContributor();
  const parsed = parcoursSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await db
      .update(parcours)
      .set({
        title: parsed.data.title,
        description: parsed.data.description || null,
        slug: slugify(parsed.data.title),
        updatedAt: new Date(),
      })
      .where(eq(parcours.id, id));
  } catch {
    return { error: "Un parcours avec ce titre existe déjà." };
  }

  revalidatePath("/dashboard/parcours");
  revalidatePath("/");
  redirect("/dashboard/parcours");
}

export async function deleteParcours(id: string) {
  await requireContributor();
  await db.delete(parcours).where(eq(parcours.id, id));
  revalidatePath("/dashboard/parcours");
  revalidatePath("/");
}

const addEtapeSchema = z.object({
  coursId: z.string().trim().min(1, "Le cours est requis."),
});

export async function addEtape(
  parcoursId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireContributor();
  const parsed = addEtapeSchema.safeParse({
    coursId: formData.get("coursId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [{ nextIndex }] = await db
    .select({ nextIndex: max(parcoursEtapes.orderIndex) })
    .from(parcoursEtapes)
    .where(eq(parcoursEtapes.parcoursId, parcoursId));

  try {
    await db.insert(parcoursEtapes).values({
      parcoursId,
      coursId: parsed.data.coursId,
      orderIndex: (nextIndex ?? -1) + 1,
    });
  } catch {
    return { error: "Ce cours fait déjà partie du parcours." };
  }

  revalidatePath("/dashboard/parcours");
  revalidatePath("/");
  return undefined;
}

export async function removeEtape(id: string, parcoursId: string) {
  await requireContributor();
  await db
    .delete(parcoursEtapes)
    .where(and(eq(parcoursEtapes.id, id), eq(parcoursEtapes.parcoursId, parcoursId)));
  revalidatePath("/dashboard/parcours");
  revalidatePath("/");
}

export async function reorderEtapes(
  parcoursId: string,
  orderedIds: string[]
): Promise<{ error?: string } | undefined> {
  await requireContributor();

  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(parcoursEtapes)
        .set({ orderIndex: index })
        .where(
          and(
            eq(parcoursEtapes.id, id),
            eq(parcoursEtapes.parcoursId, parcoursId)
          )
        )
    )
  );

  revalidatePath("/dashboard/parcours");
  revalidatePath("/");
  return undefined;
}
