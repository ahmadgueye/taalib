import { notFound } from "next/navigation";

import {
  Breadcrumbs,
  thematiqueCrumbs,
} from "@/components/dashboard/breadcrumbs";
import { RessourceForm } from "@/components/dashboard/ressource-form";
import { getAllThematiques } from "@/lib/db/queries/thematiques";
import { getRessourceById } from "@/lib/db/queries/ressources";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditRessourcePage({ params }: Props) {
  const { id } = await params;
  const [r, thematiques] = await Promise.all([
    getRessourceById(id),
    getAllThematiques(),
  ]);

  if (!r) notFound();

  const thematiqueOptions = thematiques.map((t) => ({
    id: t.id,
    title: t.title,
    coursTitle: t.cours.title,
  }));
  const parent = thematiques.find((t) => t.id === r.thematiqueId);

  return (
    <div>
      <Breadcrumbs
        items={[
          ...(parent
            ? thematiqueCrumbs(parent)
            : [{ label: "Ressources", href: "/dashboard/ressources" }]),
          { label: r.title },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Modifier la ressource
      </h1>
      <div className="mt-6">
        <RessourceForm thematiqueOptions={thematiqueOptions} ressource={r} />
      </div>
    </div>
  );
}
