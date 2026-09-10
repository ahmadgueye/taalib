"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { ressourceProgress, ressources } from "@/lib/db/schema";

const progressSchema = z.object({
  ressourceId: z.string().uuid(),
  path: z.string().startsWith("/"),
});

export async function markRessourceCompleted(
  ressourceId: string,
  path: string
): Promise<{ error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Connecte-toi pour suivre ta progression." };
  }

  const parsed = progressSchema.safeParse({ ressourceId, path });
  if (!parsed.success) {
    return { error: "Ressource invalide." };
  }

  const ressource = await db.query.ressources.findFirst({
    where: and(
      eq(ressources.id, parsed.data.ressourceId),
      eq(ressources.status, "published")
    ),
  });
  if (!ressource) {
    return { error: "Ressource introuvable." };
  }

  await db
    .insert(ressourceProgress)
    .values({ userId: profile.id, ressourceId: parsed.data.ressourceId })
    .onConflictDoNothing({
      target: [ressourceProgress.userId, ressourceProgress.ressourceId],
    });

  revalidatePath(parsed.data.path);
  return {};
}
