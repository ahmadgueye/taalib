"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { ressourceProgress, ressources } from "@/lib/db/schema";

const toggleSchema = z.object({
  ressourceId: z.string().uuid(),
  path: z.string().startsWith("/"),
});

export async function toggleRessourceCompletion(
  ressourceId: string,
  path: string
): Promise<{ error?: string; completed?: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Connecte-toi pour suivre ta progression." };
  }

  const parsed = toggleSchema.safeParse({ ressourceId, path });
  if (!parsed.success) {
    return { error: "Ressource invalide." };
  }

  const existing = await db.query.ressourceProgress.findFirst({
    where: and(
      eq(ressourceProgress.userId, profile.id),
      eq(ressourceProgress.ressourceId, parsed.data.ressourceId)
    ),
  });

  if (existing) {
    await db
      .delete(ressourceProgress)
      .where(
        and(
          eq(ressourceProgress.userId, profile.id),
          eq(ressourceProgress.ressourceId, parsed.data.ressourceId)
        )
      );
  } else {
    const ressource = await db.query.ressources.findFirst({
      where: and(
        eq(ressources.id, parsed.data.ressourceId),
        eq(ressources.status, "published")
      ),
    });
    if (!ressource) {
      return { error: "Ressource introuvable." };
    }

    await db.insert(ressourceProgress).values({
      userId: profile.id,
      ressourceId: parsed.data.ressourceId,
    });
  }

  revalidatePath(parsed.data.path);
  return { completed: !existing };
}
