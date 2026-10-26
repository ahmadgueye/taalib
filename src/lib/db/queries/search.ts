import { and, eq, exists, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/lib/db";
import type { ContentAccess } from "@/lib/content-access";
import {
  cours,
  hadiths,
  ressources,
  seanceRessources,
  seanceThematiques,
  seances,
} from "@/lib/db/schema";
import {
  ALL_ENTITY_TYPES,
  ALL_RESSOURCE_TYPES,
  type EntityType,
  type RessourceType,
  type SearchResult,
} from "@/lib/search-types";

export {
  ALL_ENTITY_TYPES,
  ALL_RESSOURCE_TYPES,
  type EntityType,
  type RessourceType,
  type SearchResult,
};

export async function searchCatalogue(
  query: string,
  options: {
    // Obligatoire : la recherche ne doit jamais remonter du contenu qu'une
    // page refuserait d'afficher.
    access: ContentAccess;
    types?: EntityType[];
    ressourceTypes?: RessourceType[];
  }
): Promise<SearchResult[]> {
  const q = query.trim();
  const { access } = options;
  const visible = access.all
    ? null
    : {
        coursIds: [...access.coursIds],
        thematiqueIds: [...access.thematiqueIds],
        ressourceIds: [...access.ressourceIds],
      };

  const types = options.types?.length ? options.types : ALL_ENTITY_TYPES;
  const ressourceTypes = options.ressourceTypes?.length
    ? options.ressourceTypes
    : ALL_RESSOURCE_TYPES;

  const pattern = `%${q}%`;
  // Empty query = browse by filters only, no text condition to apply.
  const textCondition = q.length > 0;

  const [
    coursResults,
    thematiqueResults,
    ressourceResults,
    seanceResults,
    hadithResults,
  ] = await Promise.all([
      types.includes("cours")
        ? db
            .select()
            .from(cours)
            .where(
              and(
                textCondition
                  ? or(
                      ilike(cours.title, pattern),
                      ilike(cours.description, pattern)
                    )
                  : undefined,
                visible ? inArray(cours.id, visible.coursIds) : undefined
              )
            )
            .limit(20)
        : Promise.resolve([]),
      types.includes("thematique")
        ? db.query.thematiques.findMany({
            where: (t, { ilike: like, or: orOp, and: andOp, inArray: inArr }) =>
              andOp(
                textCondition
                  ? orOp(like(t.title, pattern), like(t.description, pattern))
                  : undefined,
                visible ? inArr(t.id, visible.thematiqueIds) : undefined
              ),
            with: { cours: true },
            limit: 20,
          })
        : Promise.resolve([]),
      types.includes("ressource")
        ? db.query.ressources.findMany({
            where: and(
              textCondition
                ? or(
                    ilike(ressources.title, pattern),
                    ilike(ressources.description, pattern)
                  )
                : undefined,
              inArray(ressources.type, ressourceTypes),
              eq(ressources.status, "published"),
              visible ? inArray(ressources.id, visible.ressourceIds) : undefined
            ),
            with: { thematique: true },
            limit: 20,
          })
        : Promise.resolve([]),
      types.includes("seance")
        ? db
            .select()
            .from(seances)
            .where(
              and(
                textCondition
                  ? or(
                      ilike(seances.title, pattern),
                      ilike(seances.summary, pattern)
                    )
                  : undefined,
                visible
                  ? or(
                      exists(
                        db
                          .select()
                          .from(seanceThematiques)
                          .where(
                            and(
                              eq(seanceThematiques.seanceId, seances.id),
                              inArray(
                                seanceThematiques.thematiqueId,
                                visible.thematiqueIds
                              )
                            )
                          )
                      ),
                      exists(
                        db
                          .select()
                          .from(seanceRessources)
                          .where(
                            and(
                              eq(seanceRessources.seanceId, seances.id),
                              inArray(
                                seanceRessources.ressourceId,
                                visible.ressourceIds
                              )
                            )
                          )
                      )
                    )
                  : undefined
              )
            )
            .limit(20)
        : Promise.resolve([]),
      types.includes("hadith")
        ? db
            .select()
            .from(hadiths)
            .where(
              and(
                textCondition
                  ? or(
                      ilike(hadiths.title, pattern),
                      ilike(hadiths.translationFr, pattern),
                      ilike(hadiths.translationWolof, pattern),
                      ilike(hadiths.narrator, pattern)
                    )
                  : undefined,
                visible
                  ? inArray(hadiths.thematiqueId, visible.thematiqueIds)
                  : undefined
              )
            )
            .limit(20)
        : Promise.resolve([]),
    ]);

  return [
    ...coursResults.map((c) => ({
      type: "cours" as const,
      title: c.title,
      subtitle: c.description,
      href: `/cours/${c.slug}`,
    })),
    ...thematiqueResults.map((t) => ({
      type: "thematique" as const,
      title: t.title,
      subtitle: t.cours.title,
      href: `/thematiques/${t.slug}`,
    })),
    ...ressourceResults.map((r) => ({
      type: "ressource" as const,
      title: r.title,
      subtitle: r.type,
      href: r.url ?? `/thematiques/${r.thematique.slug}`,
    })),
    ...seanceResults.map((s) => ({
      type: "seance" as const,
      title: s.title,
      subtitle: s.sessionDate,
      href: `/seances/${s.slug}`,
    })),
    ...hadithResults.map((h) => ({
      type: "hadith" as const,
      title: h.title,
      subtitle: h.narrator,
      href: `/hadiths/${h.slug}`,
    })),
  ];
}
