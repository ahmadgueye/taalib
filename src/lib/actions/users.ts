"use server";

import { count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export type ActionState = { error?: string; success?: string } | undefined;

// Les rôles de l'équipe : un compte sans accès au dashboard reste `viewer`.
const teamRoleSchema = z.enum(["admin", "contributor"]);

export async function updateUserRole(userId: string, role: string) {
  const admin = await requireAdmin();
  const parsed = teamRoleSchema.safeParse(role);
  if (!parsed.success) {
    return { error: "Rôle invalide." };
  }

  if (userId === admin.id && parsed.data !== "admin") {
    const [{ value: adminCount }] = await db
      .select({ value: count() })
      .from(profiles)
      .where(eq(profiles.role, "admin"));
    if (adminCount <= 1) {
      return { error: "Impossible de retirer le dernier administrateur." };
    }
  }

  await db
    .update(profiles)
    .set({ role: parsed.data })
    .where(eq(profiles.id, userId));

  revalidatePath("/dashboard/utilisateurs");
}

const addTeamMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  role: teamRoleSchema,
});

// La personne doit s'être connectée au moins une fois : son profil n'existe
// qu'après sa première connexion (trigger handle_new_user).
export async function addTeamMember(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = addTeamMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [user] = await db
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${parsed.data.email}`)
    .limit(1);
  if (!user) {
    return {
      error:
        "Aucun compte avec cet e-mail. La personne doit d'abord se connecter une fois sur Taalib.",
    };
  }
  if (user.role !== "viewer") {
    return { error: "Cette personne fait déjà partie de l'équipe." };
  }

  await db
    .update(profiles)
    .set({ role: parsed.data.role })
    .where(eq(profiles.id, user.id));

  revalidatePath("/dashboard/utilisateurs");
  return { success: "Ajouté à l'équipe." };
}

// Le compte redevient un compte ordinaire. On ne se retire pas soi-même :
// il reste ainsi toujours au moins un admin.
export async function removeFromTeam(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) {
    throw new Error("Impossible de se retirer soi-même de l'équipe.");
  }

  await db
    .update(profiles)
    .set({ role: "viewer" })
    .where(eq(profiles.id, userId));

  revalidatePath("/dashboard/utilisateurs");
}
