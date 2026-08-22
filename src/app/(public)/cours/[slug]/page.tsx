import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/public/back-button";
import { EntityCard } from "@/components/public/entity-card";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getCoursBySlug, getCoursOutline } from "@/lib/db/queries/cours";
import { getCompletedRessourceIds } from "@/lib/db/queries/progress";
import { defaultDescription, siteOpenGraph } from "@/lib/metadata";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCoursBySlug(slug);
  const title = c?.title ?? "Cours";
  const description = c?.description ?? defaultDescription;
  return {
    title: `${title} — Taalib`,
    description,
    openGraph: { ...siteOpenGraph, title, description },
  };
}

export default async function CoursDetailPage({ params }: Props) {
  const { slug } = await params;
  const c = await getCoursBySlug(slug);

  if (!c) notFound();

  const profile = await getCurrentProfile();
  const outline = profile ? await getCoursOutline(c.id) : null;
  const completedIds = profile
    ? await getCompletedRessourceIds(
        profile.id,
        (outline?.thematiques ?? []).flatMap((t) => t.ressources.map((r) => r.id))
      )
    : undefined;

  function progressFor(thematiqueId: string) {
    if (!completedIds) return undefined;
    const thematique = outline?.thematiques.find((t) => t.id === thematiqueId);
    if (!thematique || thematique.ressources.length === 0) return undefined;
    const completed = thematique.ressources.filter((r) =>
      completedIds.has(r.id)
    ).length;
    return (completed / thematique.ressources.length) * 100;
  }

  return (
    <div className="animate-in fade-in duration-300">
      <BackButton />
      <nav className="mt-3 text-sm text-muted-foreground">
        <Link href="/cours" className="hover:text-foreground">
          Cours
        </Link>{" "}
        / <span className="text-foreground">{c.title}</span>
      </nav>

      <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
        {c.title}
      </h1>
      {c.description && (
        <p className="mt-2 text-muted-foreground">{c.description}</p>
      )}

      {c.status === "coming_soon" ? (
        <div className="mt-10 rounded-lg border border-dashed p-6 text-center">
          <h2 className="font-heading text-xl font-semibold">
            Bientôt disponible
          </h2>
          <p className="mt-2 text-muted-foreground">
            Ce cours arrive bientôt ! Revenez prochainement pour découvrir
            son contenu.
          </p>
        </div>
      ) : (
        <>
          <h2 className="mt-10 font-heading text-xl font-semibold">
            Thématiques
          </h2>
          {c.thematiques.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucune thématique pour ce cours pour le moment.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {c.thematiques.map((t) => (
                <EntityCard
                  key={t.id}
                  href={`/thematiques/${t.slug}`}
                  title={t.title}
                  description={t.description}
                  progress={progressFor(t.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
