import { eq } from "drizzle-orm";

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
