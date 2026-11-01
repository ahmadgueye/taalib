"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireContributor } from "@/lib/auth/get-session";
import { setFlash } from "@/lib/actions/flash";
import { db } from "@/lib/db";
import { hadithNarrators, narrators } from "@/lib/db/schema";

export type ActionState = { error?: string } | undefined;

const narratorSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
});

function revalidateNarrators() {
  revalidatePath("/dashboard/rapporteurs");
  revalidatePath("/dashboard/hadiths");
  revalidatePath("/hadiths");
  revalidatePath("/thematiques");
}

export async function createNarrator(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireContributor();
  const parsed = narratorSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await db
      .insert(narrators)
      .values({ name: parsed.data.name, createdBy: profile.id });
  } catch {
    return { error: "Un rapporteur avec ce nom existe déjà." };
  }

  revalidateNarrators();
  await setFlash("Rapporteur ajouté.");
  redirect("/dashboard/rapporteurs");
}

export async function updateNarrator(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireContributor();
  const parsed = narratorSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await db
      .update(narrators)
      .set({ name: parsed.data.name, updatedAt: new Date() })
      .where(eq(narrators.id, id));
  } catch {
    return {
      error:
        "Un rapporteur avec ce nom existe déjà. Utilisez plutôt la fusion ci-dessous.",
    };
  }

  revalidateNarrators();
  await setFlash("Rapporteur enregistré.");
  redirect("/dashboard/rapporteurs");
}

// Rattache tous les hadiths du rapporteur `id` au rapporteur `targetId`, puis
// supprime `id`. Sert à regrouper les doublons ("Boukhary" → "Al-Bukhârî").
export async function mergeNarrator(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireContributor();
  const targetId = String(formData.get("targetId") ?? "");
  if (!targetId || targetId === id) {
    return { error: "Choisissez le rapporteur à conserver." };
  }

  await db.transaction(async (tx) => {
    // Les hadiths qui citent déjà la cible gardent leur lien existant.
    const alreadyLinked = tx
      .select({ hadithId: hadithNarrators.hadithId })
      .from(hadithNarrators)
      .where(eq(hadithNarrators.narratorId, targetId));
    await tx
      .delete(hadithNarrators)
      .where(
        and(
          eq(hadithNarrators.narratorId, id),
          inArray(hadithNarrators.hadithId, alreadyLinked)
        )
      );
    await tx
      .update(hadithNarrators)
      .set({ narratorId: targetId })
      .where(eq(hadithNarrators.narratorId, id));
    await tx.delete(narrators).where(eq(narrators.id, id));
  });

  revalidateNarrators();
  await setFlash("Rapporteurs fusionnés.");
  redirect("/dashboard/rapporteurs");
}

export async function deleteNarrator(id: string) {
  await requireContributor();
  // La clé étrangère (onDelete: restrict) refuse déjà la suppression d'un
  // rapporteur encore cité ; on ne supprime que s'il n'a plus de hadith.
  await db
    .delete(narrators)
    .where(
      and(
        eq(narrators.id, id),
        sql`not exists (select 1 from ${hadithNarrators} where ${hadithNarrators.narratorId} = ${narrators.id})`
      )
    );
  revalidateNarrators();
}
