import { notFound } from "next/navigation";

import { AddEtapeForm } from "@/components/dashboard/add-etape-form";
import { ParcoursEtapesList } from "@/components/dashboard/parcours-etapes-list";
import { ParcoursForm } from "@/components/dashboard/parcours-form";
import { getAllCours } from "@/lib/db/queries/cours";
import { getParcoursById } from "@/lib/db/queries/parcours";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditParcoursPage({ params }: Props) {
  const { id } = await params;
  const [p, allCours] = await Promise.all([
    getParcoursById(id),
    getAllCours(),
  ]);

  if (!p) notFound();

  const usedCoursIds = new Set(p.etapes.map((e) => e.coursId));
  const availableCours = allCours.filter((c) => !usedCoursIds.has(c.id));

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
          L&apos;ordre détermine la progression imposée : un cours ne se
          débloque que lorsque tous les quiz du cours précédent sont réussis.
        </p>

        {p.etapes.length > 0 && (
          <div className="mt-4">
            <ParcoursEtapesList
              parcoursId={p.id}
              etapes={p.etapes.map((e) => ({
                id: e.id,
                coursTitle: e.cours.title,
              }))}
            />
          </div>
        )}

        <div className="mt-4">
          <AddEtapeForm parcoursId={p.id} coursOptions={availableCours} />
        </div>
      </div>
    </div>
  );
}
