"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export type ActionState = { error?: string } | undefined;

const fullNameSchema = z.string().trim().min(1, "Le nom est requis.");

export async function updateFullNameAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const parsed = fullNameSchema.safeParse(formData.get("fullName"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await db
    .update(profiles)
    .set({ fullName: parsed.data })
    .where(eq(profiles.id, profile.id));

  revalidatePath("/compte");

  const next = formData.get("next");
  redirect(typeof next === "string" && next ? next : "/compte");
}
