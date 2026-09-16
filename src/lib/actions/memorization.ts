"use server";

import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import type { MemorizationStatus } from "@/lib/db/schema";
import { quranMemorization } from "@/lib/db/schema";
import { getChapters } from "@/lib/quran/queries";

const statusSchema = z.enum(["en_cours", "a_renforcer", "maitrise"]);

const setStatusSchema = z.object({
  chapterId: z.number().int().min(1).max(114),
  verseNumber: z.number().int().min(1),
  status: statusSchema.nullable(),
});

// No revalidatePath here on purpose: the reader already updates its status
// map optimistically (see quran-reader.tsx's handleVerseTap) and a tap
// needs to stay instantaneous, not wait on a server round-trip + re-render.
export async function setVerseMemorizationStatus(
  chapterId: number,
  verseNumber: number,
  status: MemorizationStatus | null
): Promise<{ error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Connecte-toi pour suivre ta mémorisation." };
  }

  const parsed = setStatusSchema.safeParse({ chapterId, verseNumber, status });
  if (!parsed.success) {
    return { error: "Verset invalide." };
  }

  const verseKey = `${parsed.data.chapterId}:${parsed.data.verseNumber}`;

  if (parsed.data.status === null) {
    await db
      .delete(quranMemorization)
      .where(
        and(
          eq(quranMemorization.userId, profile.id),
          eq(quranMemorization.verseKey, verseKey)
        )
      );
    return {};
  }

  await db
    .insert(quranMemorization)
    .values({
      userId: profile.id,
      chapterId: parsed.data.chapterId,
      verseNumber: parsed.data.verseNumber,
      verseKey,
      status: parsed.data.status,
    })
    .onConflictDoUpdate({
      target: [quranMemorization.userId, quranMemorization.verseKey],
      set: { status: parsed.data.status, updatedAt: new Date() },
    });

  return {};
}

const setCountSchema = z.object({
  chapterId: z.number().int().min(1).max(114),
  memorizedCount: z.number().int().min(0),
});

// Declares memorization progress as a single count per sourate rather than
// per-verse taps: verses 1..count are marked "maîtrisé" (sequential from the
// start, matching how a sourate is actually memorized) and anything past
// count is cleared, so lowering the number genuinely rewinds progress
// instead of leaving stale verses behind.
export async function setChapterMemorizedCount(
  chapterId: number,
  memorizedCount: number
): Promise<{ error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Connecte-toi pour suivre ta mémorisation." };
  }

  const parsed = setCountSchema.safeParse({ chapterId, memorizedCount });
  if (!parsed.success) {
    return { error: "Valeur invalide." };
  }

  const chapters = await getChapters();
  const chapter = chapters.find((c) => c.id === parsed.data.chapterId);
  if (!chapter) {
    return { error: "Sourate inconnue." };
  }
  if (parsed.data.memorizedCount > chapter.versesCount) {
    return {
      error: `${chapter.nameSimple} ne compte que ${chapter.versesCount} versets.`,
    };
  }

  const { chapterId: id, memorizedCount: count } = parsed.data;

  await db.transaction(async (tx) => {
    if (count > 0) {
      const rows = Array.from({ length: count }, (_, i) => ({
        userId: profile.id,
        chapterId: id,
        verseNumber: i + 1,
        verseKey: `${id}:${i + 1}`,
        status: "maitrise" as const,
      }));
      await tx
        .insert(quranMemorization)
        .values(rows)
        .onConflictDoUpdate({
          target: [quranMemorization.userId, quranMemorization.verseKey],
          set: { status: "maitrise", updatedAt: new Date() },
        });
    }

    await tx
      .delete(quranMemorization)
      .where(
        and(
          eq(quranMemorization.userId, profile.id),
          eq(quranMemorization.chapterId, id),
          gt(quranMemorization.verseNumber, count)
        )
      );
  });

  revalidatePath("/memorisation");
  revalidatePath("/coran");
  return {};
}
