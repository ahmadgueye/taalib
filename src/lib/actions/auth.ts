"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { profileInfoSchema } from "@/lib/profile-info";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// `values` renvoie la saisie en cas d'erreur : React vide le formulaire après
// chaque envoi, l'étudiant ne doit pas tout retaper.
export type ActionState =
  | { error?: string; values?: Record<string, string> }
  | undefined;

// Enregistre les informations du profil (formulaire d'inscription et
// paramètres du compte). Le nom complet affiché partout est recomposé ici.
export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const field = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  const values = {
    firstName: field("firstName"),
    lastName: field("lastName"),
    phoneCountry: field("phoneCountry"),
    phone: field("phone"),
    address: field("address"),
    birthDate: field("birthDate"),
  };
  const parsed = profileInfoSchema({ staff: profile.role !== "viewer" }).safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values };
  }

  const { firstName, lastName, phone, address, birthDate } = parsed.data;
  await db
    .update(profiles)
    .set({
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      phone: phone || null,
      address: address || null,
      birthDate: birthDate || null,
    })
    .where(eq(profiles.id, profile.id));

  revalidatePath("/", "layout");

  const next = safeNext(field("next"));
  // À l'inscription, un étudiant sans classe passe par la saisie du code
  // (sauf s'il arrive déjà d'un lien d'invitation).
  if (field("onboarding") && profile.role === "viewer" && !next.startsWith("/rejoindre")) {
    const access = await getContentAccess();
    if (!access.all && !access.inAnyClass) redirect("/rejoindre?bienvenue=1");
  }
  redirect(next);
}

// N'accepte qu'un chemin interne, pour ne jamais rediriger hors du site.
function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/compte";
}
