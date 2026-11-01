import { HadithForm } from "@/components/dashboard/hadith-form";
import { getAllNarrators } from "@/lib/db/queries/narrators";
import { getAllThematiques } from "@/lib/db/queries/thematiques";

export default async function NewHadithPage() {
  const [thematiques, narratorOptions] = await Promise.all([
    getAllThematiques(),
    getAllNarrators(),
  ]);
  const thematiqueOptions = thematiques.map((t) => ({
    id: t.id,
    title: t.title,
    coursTitle: t.cours.title,
  }));

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Nouveau hadith
      </h1>
      <div className="mt-6">
        <HadithForm
          thematiqueOptions={thematiqueOptions}
          narratorOptions={narratorOptions}
        />
      </div>
    </div>
  );
}
