import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { cours, hadiths, parcours, seances, thematiques } from "@/lib/db/schema";

// Rebuilt at most once an hour — content changes rarely and the sitemap hits
// five tables.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const [coursRows, thematiqueRows, hadithRows, seanceRows, parcoursRows] =
    await Promise.all([
      db.select({ slug: cours.slug, updatedAt: cours.updatedAt }).from(cours),
      db
        .select({ slug: thematiques.slug, updatedAt: thematiques.updatedAt })
        .from(thematiques),
      db
        .select({ slug: hadiths.slug, updatedAt: hadiths.updatedAt })
        .from(hadiths),
      db
        .select({ slug: seances.slug, updatedAt: seances.updatedAt })
        .from(seances),
      db
        .select({ slug: parcours.slug, updatedAt: parcours.updatedAt })
        .from(parcours),
    ]);

  const entries = (
    prefix: string,
    rows: { slug: string; updatedAt: Date }[]
  ) =>
    rows.map((r) => ({
      url: `${base}/${prefix}/${r.slug}`,
      lastModified: r.updatedAt,
    }));

  return [
    ...["", "/cours", "/parcours", "/hadiths", "/seances", "/coran"].map(
      (path) => ({ url: `${base}${path}` })
    ),
    ...entries("cours", coursRows),
    ...entries("thematiques", thematiqueRows),
    ...entries("hadiths", hadithRows),
    ...entries("seances", seanceRows),
    ...entries("parcours", parcoursRows),
  ];
}
