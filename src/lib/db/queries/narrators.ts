import { asc, count, eq, getTableColumns } from "drizzle-orm";

import { db } from "@/lib/db";
import { hadithNarrators, narrators } from "@/lib/db/schema";

export async function getAllNarrators() {
  return db
    .select({
      ...getTableColumns(narrators),
      hadithCount: count(hadithNarrators.hadithId),
    })
    .from(narrators)
    .leftJoin(hadithNarrators, eq(hadithNarrators.narratorId, narrators.id))
    .groupBy(narrators.id)
    .orderBy(asc(narrators.name));
}

export async function getNarratorById(id: string) {
  const result = await db.query.narrators.findFirst({
    where: eq(narrators.id, id),
  });

  return result ?? null;
}
