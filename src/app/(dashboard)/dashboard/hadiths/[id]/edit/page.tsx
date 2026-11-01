import { notFound } from "next/navigation";

import {
  Breadcrumbs,
  thematiqueCrumbs,
} from "@/components/dashboard/breadcrumbs";
import { HadithForm } from "@/components/dashboard/hadith-form";
import { getHadithById } from "@/lib/db/queries/hadiths";
import { getAllNarrators } from "@/lib/db/queries/narrators";
import { getAllThematiques } from "@/lib/db/queries/thematiques";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ thematique?: string }>;
};

export default async function EditHadithPage({ params, searchParams }: Props) {
  const [{ id }, { thematique: fromThematique }] = await Promise.all([
    params,
    searchParams,
  ]);
  const [h, thematiques, narratorOptions] = await Promise.all([
    getHadithById(id),
    getAllThematiques(),
    getAllNarrators(),
  ]);

  if (!h) notFound();

  const thematiqueOptions = thematiques.map((t) => ({
    id: t.id,
    title: t.title,
    coursTitle: t.cours.title,
  }));
  // Ouvert depuis la page de sa thématique : le fil et le retour y mènent.
  const parent =
    fromThematique === h.thematiqueId
      ? thematiques.find((t) => t.id === h.thematiqueId)
      : undefined;

  return (
    <div>
      <Breadcrumbs
        items={[
          ...(parent
            ? thematiqueCrumbs(parent)
            : [{ label: "Hadiths", href: "/dashboard/hadiths" }]),
          { label: h.title },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Modifier le hadith
      </h1>
      <div className="mt-6">
        <HadithForm
          thematiqueOptions={thematiqueOptions}
          narratorOptions={narratorOptions}
          hadith={h}
          backToThematique={!!parent}
        />
      </div>
    </div>
  );
}
