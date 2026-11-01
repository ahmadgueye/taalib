import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { SortableReorderList } from "@/components/dashboard/sortable-reorder-list";
import { deleteThematique, reorderThematiques } from "@/lib/actions/thematiques";
import { coursStatusConfig } from "@/lib/cours-status";
import { getCoursTree } from "@/lib/db/queries/cours";

type Props = {
  params: Promise<{ id: string }>;
};

function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

export default async function CoursPage({ params }: Props) {
  const { id } = await params;
  const c = await getCoursTree(id);

  if (!c) notFound();

  const status = coursStatusConfig[c.status];

  return (
    <div className="max-w-3xl">
      <Breadcrumbs
        items={[{ label: "Cours", href: "/dashboard/cours" }, { label: c.title }]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {c.title}
            </h1>
            <Badge variant={status.badgeVariant}>{status.label}</Badge>
          </div>
          {c.description && (
            <p className="mt-1 text-muted-foreground">{c.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            render={<Link href={`/cours/${c.slug}`} />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            <ExternalLink className="size-4" />
            Voir sur le site
          </Button>
          <Button
            render={<Link href={`/dashboard/cours/${c.id}/edit`} />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            <Pencil className="size-4" />
            Modifier
          </Button>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Thématiques
            </h2>
            {c.thematiques.length > 1 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Glisse-dépose pour choisir l&apos;ordre d&apos;affichage.
              </p>
            )}
          </div>
          <Button
            render={<Link href={`/dashboard/thematiques/new?cours=${c.id}`} />}
            nativeButton={false}
            size="sm"
          >
            <Plus className="size-4" />
            Ajouter une thématique
          </Button>
        </div>

        <div className="mt-4">
          {c.thematiques.length === 0 ? (
            <p className="border border-dashed p-4 text-sm text-muted-foreground">
              Ce cours n&apos;a pas encore de thématique.
            </p>
          ) : (
            <SortableReorderList
              key={c.thematiques.map((t) => t.id).join(",")}
              items={c.thematiques.map((t) => ({
                id: t.id,
                label: t.title,
                href: `/dashboard/thematiques/${t.id}`,
                sublabel: [
                  plural(t.ressources.length, "ressource"),
                  plural(t.quiz.length, "quiz", "quiz"),
                  plural(t.hadiths.length, "hadith"),
                ].join(" · "),
                trailing: (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      render={
                        <Link href={`/dashboard/thematiques/${t.id}/edit`} />
                      }
                      nativeButton={false}
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Modifier « ${t.title} »`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <DeleteButton
                      action={deleteThematique.bind(null, t.id)}
                      itemLabel={t.title}
                      description="Ses ressources, quiz et hadiths seront supprimés avec elle. Cette action est irréversible."
                    />
                  </div>
                ),
              }))}
              onReorder={reorderThematiques.bind(null, c.id)}
            />
          )}
        </div>
      </section>
    </div>
  );
}
