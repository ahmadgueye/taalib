import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { SortableReorderList } from "@/components/dashboard/sortable-reorder-list";
import { deleteHadith } from "@/lib/actions/hadiths";
import { deleteQuiz } from "@/lib/actions/quiz";
import { deleteRessource, reorderRessources } from "@/lib/actions/ressources";
import { getThematiqueTree } from "@/lib/db/queries/thematiques";

const typeLabels = {
  video: "Vidéo",
  pdf: "PDF",
  lien: "Lien",
  texte: "Texte",
} as const;

type Props = {
  params: Promise<{ id: string }>;
};

function EditButton({ href, label }: { href: string; label: string }) {
  return (
    <Button
      render={<Link href={href} />}
      nativeButton={false}
      variant="ghost"
      size="icon-sm"
      aria-label={`Modifier « ${label} »`}
    >
      <Pencil className="size-4" />
    </Button>
  );
}

function SectionHeader({
  title,
  hint,
  addHref,
  addLabel,
}: {
  title: string;
  hint?: string;
  addHref: string;
  addLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      <Button
        render={<Link href={addHref} />}
        nativeButton={false}
        variant="outline"
        size="sm"
      >
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

const rowClass =
  "flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm";

export default async function ThematiquePage({ params }: Props) {
  const { id } = await params;
  const t = await getThematiqueTree(id);

  if (!t) notFound();

  const here = `/dashboard/thematiques/${t.id}`;

  return (
    <div className="max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "Cours", href: "/dashboard/cours" },
          { label: t.cours.title, href: `/dashboard/cours/${t.cours.id}` },
          { label: t.title },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t.title}
          </h1>
          {t.description && (
            <p className="mt-1 text-muted-foreground">{t.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            render={<Link href={`/thematiques/${t.slug}`} />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            <ExternalLink className="size-4" />
            Voir sur le site
          </Button>
          <Button
            render={<Link href={`${here}/edit`} />}
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
        <SectionHeader
          title="Ressources"
          hint={
            t.ressources.length > 1
              ? "Glisse-dépose pour choisir l'ordre d'affichage."
              : undefined
          }
          addHref={`/dashboard/ressources/new?thematique=${t.id}`}
          addLabel="Ajouter une ressource"
        />
        <div className="mt-4">
          {t.ressources.length === 0 ? (
            <EmptyState>Aucune ressource dans cette thématique.</EmptyState>
          ) : (
            <SortableReorderList
              key={t.ressources.map((r) => r.id).join(",")}
              items={t.ressources.map((r) => ({
                id: r.id,
                label: r.title,
                sublabel: typeLabels[r.type],
                href: `/dashboard/ressources/${r.id}/edit`,
                trailing: (
                  <div className="flex shrink-0 items-center gap-1">
                    {r.status === "draft" && (
                      <Badge variant="outline">Brouillon</Badge>
                    )}
                    <EditButton
                      href={`/dashboard/ressources/${r.id}/edit`}
                      label={r.title}
                    />
                    <DeleteButton
                      action={deleteRessource.bind(null, r.id)}
                      itemLabel={r.title}
                    />
                  </div>
                ),
              }))}
              onReorder={reorderRessources.bind(null, t.id)}
            />
          )}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader
          title="Quiz"
          addHref={`/dashboard/quiz/new?thematique=${t.id}`}
          addLabel="Ajouter un quiz"
        />
        <div className="mt-4">
          {t.quiz.length === 0 ? (
            <EmptyState>Aucun quiz dans cette thématique.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {t.quiz.map((q) => (
                <li key={q.id} className={rowClass}>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/quiz/${q.id}`}
                      className="block truncate font-medium hover:underline hover:underline-offset-4"
                    >
                      {q.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {q.questions.length} question
                      {q.questions.length > 1 ? "s" : ""}
                    </div>
                  </div>
                  {q.status === "draft" && (
                    <Badge variant="outline">Brouillon</Badge>
                  )}
                  <EditButton href={`/dashboard/quiz/${q.id}`} label={q.title} />
                  <DeleteButton
                    action={deleteQuiz.bind(null, q.id)}
                    itemLabel={q.title}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader
          title="Hadiths"
          addHref={`/dashboard/hadiths/new?thematique=${t.id}`}
          addLabel="Ajouter un hadith"
        />
        <div className="mt-4">
          {t.hadiths.length === 0 ? (
            <EmptyState>Aucun hadith dans cette thématique.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {t.hadiths.map((h) => (
                <li key={h.id} className={rowClass}>
                  <Link
                    href={`/dashboard/hadiths/${h.id}/edit?thematique=${t.id}`}
                    className="min-w-0 flex-1 truncate font-medium hover:underline hover:underline-offset-4"
                  >
                    {h.title}
                  </Link>
                  <EditButton
                    href={`/dashboard/hadiths/${h.id}/edit?thematique=${t.id}`}
                    label={h.title}
                  />
                  <DeleteButton
                    action={deleteHadith.bind(null, h.id)}
                    itemLabel={h.title}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
