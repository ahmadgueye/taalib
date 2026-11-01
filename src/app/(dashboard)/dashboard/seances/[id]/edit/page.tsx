import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { SeanceForm } from "@/components/dashboard/seance-form";
import { getAllRessources } from "@/lib/db/queries/ressources";
import { getSeanceById } from "@/lib/db/queries/seances";
import { getAllThematiques } from "@/lib/db/queries/thematiques";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditSeancePage({ params }: Props) {
  const { id } = await params;
  const [s, thematiques, ressourcesList] = await Promise.all([
    getSeanceById(id),
    getAllThematiques(),
    getAllRessources(),
  ]);

  if (!s) notFound();

  const thematiqueOptions = thematiques.map((t) => ({
    id: t.id,
    title: t.title,
    coursTitle: t.cours.title,
  }));
  const ressourceOptions = ressourcesList.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    coursTitle: r.thematique.cours.title,
    thematiqueTitle: r.thematique.title,
  }));

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Séances", href: "/dashboard/seances" },
          { label: s.title },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Modifier la séance
      </h1>
      <div className="mt-6">
        <SeanceForm
          thematiqueOptions={thematiqueOptions}
          ressourceOptions={ressourceOptions}
          seance={s}
          linkedThematiqueIds={s.seanceThematiques.map((st) => st.thematiqueId)}
          linkedRessourceIds={s.seanceRessources.map((sr) => sr.ressourceId)}
        />
      </div>
    </div>
  );
}
