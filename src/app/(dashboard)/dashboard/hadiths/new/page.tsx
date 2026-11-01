import {
  Breadcrumbs,
  thematiqueCrumbs,
} from "@/components/dashboard/breadcrumbs";
import { HadithForm } from "@/components/dashboard/hadith-form";
import { getAllNarrators } from "@/lib/db/queries/narrators";
import { getAllThematiques } from "@/lib/db/queries/thematiques";

type Props = {
  searchParams: Promise<{ thematique?: string }>;
};

export default async function NewHadithPage({ searchParams }: Props) {
  const [{ thematique: thematiqueId }, thematiques, narratorOptions] =
    await Promise.all([searchParams, getAllThematiques(), getAllNarrators()]);
  const thematiqueOptions = thematiques.map((t) => ({
    id: t.id,
    title: t.title,
    coursTitle: t.cours.title,
  }));
  const parent = thematiques.find((t) => t.id === thematiqueId);

  return (
    <div>
      <Breadcrumbs
        items={[
          ...(parent
            ? thematiqueCrumbs(parent)
            : [{ label: "Hadiths", href: "/dashboard/hadiths" }]),
          { label: "Nouveau hadith" },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Nouveau hadith
      </h1>
      <div className="mt-6">
        <HadithForm
          thematiqueOptions={thematiqueOptions}
          narratorOptions={narratorOptions}
          defaultThematiqueId={parent?.id}
          backToThematique={!!parent}
        />
      </div>
    </div>
  );
}
