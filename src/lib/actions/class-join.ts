"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/get-session";
import { normalizeInviteCode } from "@/lib/class-invite";
import { db } from "@/lib/db";
import { getClassByInviteCode } from "@/lib/db/queries/classes";
import { classMembers } from "@/lib/db/schema";

export type JoinClassState = { error?: string; joined?: boolean } | undefined;

// Ouvert à tout utilisateur connecté (pas seulement aux admins) : c'est
// l'étudiant lui-même qui s'inscrit avec le code que l'enseignant a partagé.
// Liée au code avec bind() et passée à useActionState, qui lui transmet
// l'état précédent en argument : inutile ici, donc pas déclaré.
export async function joinClass(code: string): Promise<JoinClassState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Connecte-toi pour rejoindre la classe." };
  }

  const found = await getClassByInviteCode(normalizeInviteCode(code));
  if (!found || !found.inviteEnabled) {
    return { error: "Ce code d'invitation n'est pas valide." };
  }

  await db
    .insert(classMembers)
    .values({ classId: found.id, userId: profile.id })
    .onConflictDoNothing();

  revalidatePath(`/rejoindre/${code}`);
  revalidatePath(`/dashboard/classes/${found.id}`);
  return { joined: true };
}
