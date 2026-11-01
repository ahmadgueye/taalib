"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireContributor } from "@/lib/auth/get-session";
import { setFlash } from "@/lib/actions/flash";
import { db } from "@/lib/db";
import { seanceRessources, seanceThematiques, seances } from "@/lib/db/schema";
import { slugify } from "@/lib/utils";

export type ActionState = { error?: string } | undefined;

const seanceSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis."),
  sessionDate: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  thematiqueIds: z.array(z.string()).default([]),
  ressourceIds: z.array(z.string()).default([]),
});

function parseSeanceForm(formData: FormData) {
  return seanceSchema.safeParse({
    title: formData.get("title"),
    sessionDate: formData.get("sessionDate"),
    summary: formData.get("summary"),
    thematiqueIds: formData.getAll("thematiqueIds"),
    ressourceIds: formData.getAll("ressourceIds"),
  });
}

export async function createSeance(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireContributor();
  const parsed = parseSeanceForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  let newId: string;
  try {
    const [inserted] = await db
      .insert(seances)
      .values({
        title: parsed.data.title,
        sessionDate: parsed.data.sessionDate || null,
        summary: parsed.data.summary || null,
        slug: slugify(parsed.data.title),
        createdBy: profile.id,
      })
      .returning();
    newId = inserted.id;
  } catch {
    return { error: "Une séance avec ce titre existe déjà." };
  }

  if (parsed.data.thematiqueIds.length > 0) {
    await db
      .insert(seanceThematiques)
      .values(
        parsed.data.thematiqueIds.map((thematiqueId) => ({
          seanceId: newId,
          thematiqueId,
        }))
      );
  }
  if (parsed.data.ressourceIds.length > 0) {
    await db
      .insert(seanceRessources)
      .values(
        parsed.data.ressourceIds.map((ressourceId) => ({
          seanceId: newId,
          ressourceId,
        }))
      );
  }

  revalidatePath("/dashboard/seances");
  revalidatePath("/seances");
  revalidatePath("/");
  await setFlash("Séance créée.");
  redirect("/dashboard/seances");
}

export async function updateSeance(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireContributor();
  const parsed = parseSeanceForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await db
      .update(seances)
      .set({
        title: parsed.data.title,
        sessionDate: parsed.data.sessionDate || null,
        summary: parsed.data.summary || null,
        slug: slugify(parsed.data.title),
        updatedAt: new Date(),
      })
      .where(eq(seances.id, id));
  } catch {
    return { error: "Une séance avec ce titre existe déjà." };
  }

  await db.delete(seanceThematiques).where(eq(seanceThematiques.seanceId, id));
  await db.delete(seanceRessources).where(eq(seanceRessources.seanceId, id));

  if (parsed.data.thematiqueIds.length > 0) {
    await db
      .insert(seanceThematiques)
      .values(
        parsed.data.thematiqueIds.map((thematiqueId) => ({
          seanceId: id,
          thematiqueId,
        }))
      );
  }
  if (parsed.data.ressourceIds.length > 0) {
    await db
      .insert(seanceRessources)
      .values(
        parsed.data.ressourceIds.map((ressourceId) => ({
          seanceId: id,
          ressourceId,
        }))
      );
  }

  revalidatePath("/dashboard/seances");
  revalidatePath("/seances");
  revalidatePath("/");
  await setFlash("Séance enregistrée.");
  redirect("/dashboard/seances");
}

export async function deleteSeance(id: string) {
  await requireContributor();
  await db.delete(seances).where(eq(seances.id, id));
  revalidatePath("/dashboard/seances");
  revalidatePath("/seances");
  revalidatePath("/");
}
