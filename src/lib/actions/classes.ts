"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/get-session";
import { generateInviteCode } from "@/lib/class-invite";
import { db } from "@/lib/db";
import {
  classCours,
  classMembers,
  classUnlocks,
  classes,
  profiles,
  thematiques,
} from "@/lib/db/schema";

export type ActionState = { error?: string; success?: string } | undefined;

// Les classes regroupent des étudiants (données personnelles) : réservées aux
// admins, pas aux contributeurs qui ne gèrent que le contenu.

const classSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  description: z.string().trim().optional(),
});

export async function createClass(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireAdmin();
  const parsed = classSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [created] = await db
    .insert(classes)
    .values({
      name: parsed.data.name,
      description: parsed.data.description || null,
      inviteCode: generateInviteCode(),
      createdBy: profile.id,
    })
    .returning({ id: classes.id });

  revalidatePath("/dashboard/classes");
  redirect(`/dashboard/classes/${created.id}`);
}

export async function updateClass(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = classSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await db
    .update(classes)
    .set({
      name: parsed.data.name,
      description: parsed.data.description || null,
      updatedAt: new Date(),
    })
    .where(eq(classes.id, id));

  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${id}`);
  return { success: "Classe enregistrée." };
}

export async function deleteClass(id: string) {
  await requireAdmin();
  await db.delete(classes).where(eq(classes.id, id));
  revalidatePath("/dashboard/classes");
}

export async function regenerateInviteCode(id: string) {
  await requireAdmin();
  await db
    .update(classes)
    .set({ inviteCode: generateInviteCode(), updatedAt: new Date() })
    .where(eq(classes.id, id));
  revalidatePath(`/dashboard/classes/${id}`);
}

export async function setInviteEnabled(id: string, enabled: boolean) {
  await requireAdmin();
  await db
    .update(classes)
    .set({ inviteEnabled: enabled, updatedAt: new Date() })
    .where(eq(classes.id, id));
  revalidatePath(`/dashboard/classes/${id}`);
}

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
});

export async function addClassMember(
  classId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = addMemberSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [student] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${parsed.data.email}`)
    .limit(1);
  if (!student) {
    return {
      error:
        "Aucun compte avec cet e-mail. L'étudiant doit d'abord se connecter une fois, ou rejoindre avec le code d'invitation.",
    };
  }

  const inserted = await db
    .insert(classMembers)
    .values({ classId, userId: student.id })
    .onConflictDoNothing()
    .returning({ userId: classMembers.userId });
  if (inserted.length === 0) {
    return { error: "Cet étudiant fait déjà partie de la classe." };
  }

  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${classId}`);
  return { success: "Étudiant ajouté." };
}

export async function removeClassMember(classId: string, userId: string) {
  await requireAdmin();
  await db
    .delete(classMembers)
    .where(
      and(eq(classMembers.classId, classId), eq(classMembers.userId, userId))
    );
  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${classId}`);
}

const addCoursSchema = z.object({
  coursId: z.uuid("Choisis un cours."),
});

export async function addClassCours(
  classId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = addCoursSchema.safeParse({ coursId: formData.get("coursId") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await db
    .insert(classCours)
    .values({ classId, coursId: parsed.data.coursId })
    .onConflictDoNothing();

  revalidatePath(`/dashboard/classes/${classId}`);
  return undefined;
}

// Retirer un cours efface aussi les déblocages de ses thématiques pour cette
// classe : le remettre plus tard repart d'un cours entièrement verrouillé.
export async function removeClassCours(classId: string, coursId: string) {
  await requireAdmin();
  await db.transaction(async (tx) => {
    const coursThematiques = tx
      .select({ id: thematiques.id })
      .from(thematiques)
      .where(eq(thematiques.coursId, coursId));
    await tx
      .delete(classUnlocks)
      .where(
        and(
          eq(classUnlocks.classId, classId),
          inArray(classUnlocks.thematiqueId, coursThematiques)
        )
      );
    await tx
      .delete(classCours)
      .where(and(eq(classCours.classId, classId), eq(classCours.coursId, coursId)));
  });
  revalidatePath(`/dashboard/classes/${classId}`);
}

// Ne débloque que des thématiques dont le cours est bien suivi par la classe.
async function thematiquesOfClassCours(
  classId: string,
  where: ReturnType<typeof eq>
) {
  return db
    .select({ id: thematiques.id })
    .from(thematiques)
    .innerJoin(
      classCours,
      and(
        eq(classCours.coursId, thematiques.coursId),
        eq(classCours.classId, classId)
      )
    )
    .where(where);
}

export async function setThematiqueUnlocked(
  classId: string,
  thematiqueId: string,
  unlocked: boolean
): Promise<{ error?: string }> {
  await requireAdmin();

  if (!unlocked) {
    await db
      .delete(classUnlocks)
      .where(
        and(
          eq(classUnlocks.classId, classId),
          eq(classUnlocks.thematiqueId, thematiqueId)
        )
      );
  } else {
    const [found] = await thematiquesOfClassCours(
      classId,
      eq(thematiques.id, thematiqueId)
    );
    if (!found) {
      return { error: "Cette thématique ne fait partie d'aucun cours de la classe." };
    }
    await db
      .insert(classUnlocks)
      .values({ classId, thematiqueId })
      .onConflictDoNothing();
  }

  revalidatePath(`/dashboard/classes/${classId}`);
  return {};
}

export async function unlockAllThematiques(classId: string, coursId: string) {
  await requireAdmin();
  const rows = await thematiquesOfClassCours(
    classId,
    eq(thematiques.coursId, coursId)
  );
  if (rows.length > 0) {
    await db
      .insert(classUnlocks)
      .values(rows.map((r) => ({ classId, thematiqueId: r.id })))
      .onConflictDoNothing();
  }
  revalidatePath(`/dashboard/classes/${classId}`);
}
