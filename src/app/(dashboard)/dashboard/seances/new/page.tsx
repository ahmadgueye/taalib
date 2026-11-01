import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { SeanceForm } from "@/components/dashboard/seance-form";
import { getAllRessources } from "@/lib/db/queries/ressources";
import { getAllThematiques } from "@/lib/db/queries/thematiques";

export default async function NewSeancePage() {
  const [thematiques, ressourcesList] = await Promise.all([
    getAllThematiques(),
    getAllRessources(),
  ]);

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
          { label: "Nouvelle séance" },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Nouvelle séance
      </h1>
      <div className="mt-6">
        <SeanceForm
          thematiqueOptions={thematiqueOptions}
          ressourceOptions={ressourceOptions}
        />
      </div>
    </div>
  );
}
