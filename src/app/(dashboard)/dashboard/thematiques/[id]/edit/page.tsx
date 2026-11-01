import { notFound } from "next/navigation";

import {
  Breadcrumbs,
  thematiqueCrumbs,
} from "@/components/dashboard/breadcrumbs";
import { ThematiqueForm } from "@/components/dashboard/thematique-form";
import { getAllCours } from "@/lib/db/queries/cours";
import { getThematiqueTree } from "@/lib/db/queries/thematiques";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditThematiquePage({ params }: Props) {
  const { id } = await params;
  const [t, coursOptions] = await Promise.all([
    getThematiqueTree(id),
    getAllCours(),
  ]);

  if (!t) notFound();

  return (
    <div>
      <Breadcrumbs items={[...thematiqueCrumbs(t), { label: "Modifier" }]} />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Modifier la thématique
      </h1>
      <div className="mt-6">
        <ThematiqueForm
          coursOptions={coursOptions}
          thematique={{ ...t, coursId: t.cours.id }}
        />
      </div>
    </div>
  );
}
