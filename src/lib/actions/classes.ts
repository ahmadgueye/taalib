"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/get-session";
import { generateInviteCode } from "@/lib/class-invite";
import { db } from "@/lib/db";
import { classMembers, classes, profiles } from "@/lib/db/schema";

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
