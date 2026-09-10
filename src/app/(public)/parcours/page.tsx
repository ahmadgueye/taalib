import type { Metadata } from "next";

import { EntityCard } from "@/components/public/entity-card";
import { getAllParcours } from "@/lib/db/queries/parcours";

export const metadata: Metadata = {
  title: "Parcours — Taalib",
};

export default async function ParcoursListPage() {
  const parcoursList = await getAllParcours();

  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Parcours
      </h1>
      <p className="mt-2 text-muted-foreground">
        Des progressions imposées, cours après cours, pour aller au bout
        d&apos;un sujet.
      </p>

      {parcoursList.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Aucun parcours pour le moment.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parcoursList.map((p) => (
            <EntityCard
              key={p.id}
              href={`/parcours/${p.slug}`}
              title={p.title}
              description={
                p.description ??
                (p.etapes.length > 0
                  ? p.etapes.map((e) => e.thematique.title).join(" → ")
                  : null)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
