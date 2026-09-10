import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Calendar, ListTree, Quote, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SearchForm } from "@/components/public/search-form";
import {
  ALL_ENTITY_TYPES,
  ALL_RESSOURCE_TYPES,
  searchCatalogue,
  type EntityType,
  type RessourceType,
  type SearchResult,
} from "@/lib/db/queries/search";
import { ressourceTypeConfig } from "@/lib/ressource-types";

export const metadata: Metadata = {
  title: "Recherche — Taalib",
};

const typeLabels: Record<SearchResult["type"], string> = {
  cours: "Cours",
  thematique: "Thématique",
  ressource: "Ressource",
  seance: "Séance",
  hadith: "Hadith",
};

const entityIcons: Record<Exclude<SearchResult["type"], "ressource">, LucideIcon> =
  {
    cours: BookOpen,
    thematique: ListTree,
    seance: Calendar,
    hadith: Quote,
  };

function resultDisplay(r: SearchResult) {
  if (r.type === "ressource") {
    const rtype = (r.subtitle as RessourceType) ?? "lien";
    const config = ressourceTypeConfig[rtype];
    return { label: config.label, Icon: config.icon, subtitle: null };
  }
  return {
    label: typeLabels[r.type],
    Icon: entityIcons[r.type],
    subtitle: r.subtitle,
  };
}

type Props = {
  searchParams: Promise<{
    q?: string;
    types?: string | string[];
    rtype?: string | string[];
  }>;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function RecherchePage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q ?? "";
  const typesValues = toArray(params.types);
  const rtypeValues = toArray(params.rtype);

  const checkedTypes = typesValues.filter((t) =>
    ALL_ENTITY_TYPES.includes(t as EntityType)
  ) as EntityType[];
  const checkedRessourceTypes = rtypeValues.filter((t) =>
    ALL_RESSOURCE_TYPES.includes(t as RessourceType)
  ) as RessourceType[];

  const selectedTypes = checkedTypes.length ? checkedTypes : ALL_ENTITY_TYPES;
  const selectedRessourceTypes = checkedRessourceTypes.length
    ? checkedRessourceTypes
    : ALL_RESSOURCE_TYPES;

  const hasSearched = params.q !== undefined;
  const results = hasSearched
    ? await searchCatalogue(q, {
        types: selectedTypes,
        ressourceTypes: selectedRessourceTypes,
      })
    : [];

  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Recherche
      </h1>

      <SearchForm
        key={`${q}-${checkedTypes.join(",")}-${checkedRessourceTypes.join(",")}`}
        q={q}
        selectedTypes={checkedTypes}
        selectedRessourceTypes={checkedRessourceTypes}
        typeLabels={typeLabels}
      />

      {hasSearched && (
        <p className="mt-6 text-sm text-muted-foreground">
          {results.length} résultat{results.length > 1 ? "s" : ""}
          {q && (
            <>
              {" "}
              pour « {q} »
            </>
          )}
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {results.map((r, i) => {
          const { label, Icon, subtitle } = resultDisplay(r);
          return (
            <Link
              key={`${r.type}-${i}`}
              href={r.href}
              className="border p-4 transition-colors hover:bg-muted"
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon className="size-3.5 text-muted-foreground" />
                <Badge variant="secondary">{label}</Badge>
              </span>
              <div className="mt-1 font-medium">{r.title}</div>
              {subtitle && (
                <div className="text-sm text-muted-foreground">
                  {subtitle}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
