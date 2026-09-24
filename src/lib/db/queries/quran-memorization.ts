import { eq, max } from "drizzle-orm";

import { db } from "@/lib/db";
import type { MemorizationStatus } from "@/lib/db/schema";
import { quranMemorization } from "@/lib/db/schema";

// An anonymous visitor has by definition nothing tracked — mirrors the
// userId-may-be-null pattern in `parcours.ts` rather than throwing/redirecting.
export async function getMemorizationStatus(
  userId: string | null
): Promise<Record<string, MemorizationStatus>> {
  if (!userId) return {};

  const rows = await db
    .select({
      verseKey: quranMemorization.verseKey,
      status: quranMemorization.status,
    })
    .from(quranMemorization)
    .where(eq(quranMemorization.userId, userId));

  return Object.fromEntries(rows.map((row) => [row.verseKey, row.status]));
}

// Latest per-verse updatedAt, grouped by chapter — the only timestamp signal
// available (no session/history log), used for the "reprise récente" list on
// the dashboard. ISO strings so the value crosses the server/client boundary
// as a plain, comparable value.
export async function getRecentChapterActivity(
  userId: string | null
): Promise<Record<number, string>> {
  if (!userId) return {};

  const rows = await db
    .select({
      chapterId: quranMemorization.chapterId,
      lastUpdatedAt: max(quranMemorization.updatedAt),
    })
    .from(quranMemorization)
    .where(eq(quranMemorization.userId, userId))
    .groupBy(quranMemorization.chapterId);

  const result: Record<number, string> = {};
  for (const row of rows) {
    if (row.lastUpdatedAt) {
      result[row.chapterId] = new Date(row.lastUpdatedAt).toISOString();
    }
  }
  return result;
}
