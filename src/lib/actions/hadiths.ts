"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireContributor } from "@/lib/auth/get-session";
import { setFlash } from "@/lib/actions/flash";
import { revalidateCoursTree } from "@/lib/actions/revalidate-tree";
import { db } from "@/lib/db";
import { hadithNarrators, hadiths, narrators } from "@/lib/db/schema";
import { slugify } from "@/lib/utils";

export type ActionState = { error?: string } | undefined;

const hadithSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis."),
  arabicText: z.string().trim().min(1, "Le texte arabe est requis."),
  translationFr: z.string().trim().min(1, "La traduction est requise."),
  translationWolof: z.string().trim().optional(),
  // Chaque valeur vaut "id:<uuid>" (rapporteur existant) ou "new:<nom>"
  // (rapporteur à créer), dans l'ordre choisi dans le formulaire.
  narrators: z
    .array(z.string().regex(/^(id|new):.+/))
    .min(1, "Au moins un rapporteur est requis."),
  source: z.string().trim().optional(),
  thematiqueId: z.string().trim().min(1, "La thématique est requise."),
});

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Remplace les rapporteurs du hadith par la liste reçue, en créant au passage
// ceux qui n'existent pas encore (ou en réutilisant un homonyme existant,
// sans tenir compte de la casse).
async function setHadithNarrators(
  tx: Tx,
  hadithId: string,
  values: string[],
  profileId: string
) {
  const narratorIds: string[] = [];
  for (const value of values) {
    const [kind, ...rest] = value.split(":");
    const payload = rest.join(":").trim();
    if (kind === "id") {
      narratorIds.push(payload);
      continue;
    }
    const existing = await tx.query.narrators.findFirst({
      where: sql`lower(${narrators.name}) = lower(${payload})`,
    });
    if (existing) {
      narratorIds.push(existing.id);
    } else {
      const [created] = await tx
        .insert(narrators)
        .values({ name: payload, createdBy: profileId })
        .returning();
      narratorIds.push(created.id);
    }
  }

  const uniqueIds = [...new Set(narratorIds)];
  await tx.delete(hadithNarrators).where(eq(hadithNarrators.hadithId, hadithId));
  await tx.insert(hadithNarrators).values(
    uniqueIds.map((narratorId, index) => ({
      hadithId,
      narratorId,
      orderIndex: index,
    }))
  );
}

function parseHadithForm(formData: FormData) {
  return hadithSchema.safeParse({
    title: formData.get("title"),
    arabicText: formData.get("arabicText"),
    translationFr: formData.get("translationFr"),
    translationWolof: formData.get("translationWolof"),
    narrators: formData.getAll("narrators"),
    source: formData.get("source"),
    thematiqueId: formData.get("thematiqueId"),
  });
}

export async function createHadith(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireContributor();
  const parsed = parseHadithForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(hadiths)
        .values({
          title: parsed.data.title,
          slug: slugify(parsed.data.title),
          arabicText: parsed.data.arabicText,
          translationFr: parsed.data.translationFr,
          translationWolof: parsed.data.translationWolof || null,
          source: parsed.data.source || null,
          thematiqueId: parsed.data.thematiqueId,
          addedBy: profile.id,
        })
        .returning();
      await setHadithNarrators(
        tx,
        inserted.id,
        parsed.data.narrators,
        profile.id
      );
    });
  } catch {
    return { error: "Un hadith avec ce titre existe déjà." };
  }

  revalidatePath("/dashboard/hadiths");
  revalidatePath("/dashboard/rapporteurs");
  revalidatePath("/hadiths");
  revalidatePath("/thematiques");
  revalidateCoursTree();
  // Ouvert depuis la page d'une thématique : on y revient.
  await setFlash("Hadith ajouté.");
  redirect(
    formData.get("backToThematique")
      ? `/dashboard/thematiques/${parsed.data.thematiqueId}`
      : "/dashboard/hadiths"
  );
}

export async function updateHadith(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireContributor();
  const parsed = parseHadithForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(hadiths)
        .set({
          title: parsed.data.title,
          slug: slugify(parsed.data.title),
          arabicText: parsed.data.arabicText,
          translationFr: parsed.data.translationFr,
          translationWolof: parsed.data.translationWolof || null,
          source: parsed.data.source || null,
          thematiqueId: parsed.data.thematiqueId,
          updatedAt: new Date(),
        })
        .where(eq(hadiths.id, id));
      await setHadithNarrators(tx, id, parsed.data.narrators, profile.id);
    });
  } catch {
    return { error: "Un hadith avec ce titre existe déjà." };
  }

  revalidatePath("/dashboard/hadiths");
  revalidatePath("/dashboard/rapporteurs");
  revalidatePath("/hadiths");
  revalidatePath("/thematiques");
  revalidateCoursTree();
  // Ouvert depuis la page d'une thématique : on y revient.
  await setFlash("Hadith enregistré.");
  redirect(
    formData.get("backToThematique")
      ? `/dashboard/thematiques/${parsed.data.thematiqueId}`
      : "/dashboard/hadiths"
  );
}

export async function deleteHadith(id: string) {
  await requireContributor();
  await db.delete(hadiths).where(eq(hadiths.id, id));
  revalidatePath("/dashboard/hadiths");
  revalidatePath("/dashboard/rapporteurs");
  revalidatePath("/hadiths");
  revalidatePath("/thematiques");
  revalidateCoursTree();
}
