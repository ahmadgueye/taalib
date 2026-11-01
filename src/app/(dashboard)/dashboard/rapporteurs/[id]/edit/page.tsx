import { notFound } from "next/navigation";

import { NarratorForm } from "@/components/dashboard/narrator-form";
import { NarratorMergeForm } from "@/components/dashboard/narrator-merge-form";
import { getAllNarrators, getNarratorById } from "@/lib/db/queries/narrators";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditRapporteurPage({ params }: Props) {
  const { id } = await params;
  const [n, allNarrators] = await Promise.all([
    getNarratorById(id),
    getAllNarrators(),
  ]);

  if (!n) notFound();

  const mergeOptions = allNarrators
    .filter((other) => other.id !== n.id)
    .map((other) => ({ id: other.id, name: other.name }));

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Modifier le rapporteur
      </h1>
      <div className="mt-6">
        <NarratorForm narrator={n} />
      </div>

      {mergeOptions.length > 0 && (
        <div className="mt-10 max-w-lg">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Fusionner avec un autre rapporteur
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pour regrouper deux orthographes du même nom : les hadiths de «{" "}
            {n.name} » passent au rapporteur choisi, puis « {n.name} » est
            supprimé.
          </p>
          <div className="mt-4">
            <NarratorMergeForm narrator={n} options={mergeOptions} />
          </div>
        </div>
      )}
    </div>
  );
}
