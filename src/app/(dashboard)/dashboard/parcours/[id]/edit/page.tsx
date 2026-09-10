import { notFound } from "next/navigation";

import { AddEtapeForm } from "@/components/dashboard/add-etape-form";
import { ParcoursEtapesList } from "@/components/dashboard/parcours-etapes-list";
import { ParcoursForm } from "@/components/dashboard/parcours-form";
import { getAllThematiques } from "@/lib/db/queries/thematiques";
import { getParcoursById } from "@/lib/db/queries/parcours";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditParcoursPage({ params }: Props) {
  const { id } = await params;
  const [p, allThematiques] = await Promise.all([
    getParcoursById(id),
    getAllThematiques(),
  ]);

  if (!p) notFound();

  const usedThematiqueIds = new Set(p.etapes.map((e) => e.thematiqueId));
  const availableThematiques = allThematiques.filter(
    (t) => !usedThematiqueIds.has(t.id)
  );

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Modifier le parcours
      </h1>
      <div className="mt-6">
        <ParcoursForm parcours={p} />
      </div>

      <div className="mt-10 max-w-lg">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Étapes du parcours
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          L&apos;ordre détermine la progression imposée : une thématique ne se
          débloque que lorsque tous les quiz de la thématique précédente sont
          réussis.
        </p>

        {p.etapes.length > 0 && (
          <div className="mt-4">
            <ParcoursEtapesList
              parcoursId={p.id}
              etapes={p.etapes.map((e) => ({
                id: e.id,
                label: `${e.thematique.cours.title} — ${e.thematique.title}`,
              }))}
            />
          </div>
        )}

        <div className="mt-4">
          <AddEtapeForm
            key={availableThematiques.map((t) => t.id).join(",")}
            parcoursId={p.id}
            thematiqueOptions={availableThematiques.map((t) => ({
              id: t.id,
              title: t.title,
              coursTitle: t.cours.title,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
