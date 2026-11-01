import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { ThematiqueForm } from "@/components/dashboard/thematique-form";
import { getAllCours } from "@/lib/db/queries/cours";

type Props = {
  searchParams: Promise<{ cours?: string }>;
};

export default async function NewThematiquePage({ searchParams }: Props) {
  const [{ cours: coursId }, coursOptions] = await Promise.all([
    searchParams,
    getAllCours(),
  ]);
  const parent = coursOptions.find((c) => c.id === coursId);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Cours", href: "/dashboard/cours" },
          ...(parent
            ? [{ label: parent.title, href: `/dashboard/cours/${parent.id}` }]
            : []),
          { label: "Nouvelle thématique" },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Nouvelle thématique
      </h1>
      <div className="mt-6">
        <ThematiqueForm coursOptions={coursOptions} defaultCoursId={parent?.id} />
      </div>
    </div>
  );
}
