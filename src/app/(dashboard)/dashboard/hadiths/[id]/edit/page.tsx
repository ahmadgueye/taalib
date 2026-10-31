import { notFound } from "next/navigation";

import { HadithForm } from "@/components/dashboard/hadith-form";
import { getHadithById } from "@/lib/db/queries/hadiths";
import { getAllNarrators } from "@/lib/db/queries/narrators";
import { getAllThematiques } from "@/lib/db/queries/thematiques";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditHadithPage({ params }: Props) {
  const { id } = await params;
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

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Modifier le hadith
      </h1>
      <div className="mt-6">
        <HadithForm
          thematiqueOptions={thematiqueOptions}
          narratorOptions={narratorOptions}
          hadith={h}
        />
      </div>
    </div>
  );
}
