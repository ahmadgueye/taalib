import { and, asc, count, eq, lte, max, or } from "drizzle-orm";

import { db } from "@/lib/db";
import type { MemorizationStatus } from "@/lib/db/schema";
import { quranMemorization } from "@/lib/db/schema";

// A verse is "due" either because it's flagged "à renforcer" (always due,
// no schedule needed) or because it's "maîtrisé" and its Leitner box
// schedule (`nextReviewAt`) has come up — see scheduleNextReview.
const dueCondition = (userId: string) =>
  and(
    eq(quranMemorization.userId, userId),
    or(
      eq(quranMemorization.status, "a_renforcer"),
      and(
        eq(quranMemorization.status, "maitrise"),
        lte(quranMemorization.nextReviewAt, new Date())
      )
    )
  );

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

export async function getDueReviews(userId: string) {
  return db.query.quranMemorization.findMany({
    where: dueCondition(userId),
    orderBy: [
      asc(quranMemorization.chapterId),
      asc(quranMemorization.verseNumber),
    ],
  });
}

export type DueReviewsSummary = {
  aRenforcerCount: number;
  maitriseDueCount: number;
  total: number;
};

// Lightweight count-only variant for the header bell — a plain COUNT per
// bucket rather than fetching full rows.
export async function getDueReviewsSummary(
  userId: string | null
): Promise<DueReviewsSummary> {
  if (!userId) return { aRenforcerCount: 0, maitriseDueCount: 0, total: 0 };

  const rows = await db
    .select({
      status: quranMemorization.status,
      value: count(),
    })
    .from(quranMemorization)
    .where(dueCondition(userId))
    .groupBy(quranMemorization.status);

  const aRenforcerCount =
    rows.find((r) => r.status === "a_renforcer")?.value ?? 0;
  const maitriseDueCount =
    rows.find((r) => r.status === "maitrise")?.value ?? 0;

  return {
    aRenforcerCount,
    maitriseDueCount,
    total: aRenforcerCount + maitriseDueCount,
  };
}
