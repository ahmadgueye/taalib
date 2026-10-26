import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowRight } from "lucide-react";

import { BackButton } from "@/components/public/back-button";
import { EntityCard } from "@/components/public/entity-card";
import { ProgressIndicator } from "@/components/public/progress-indicator";
import { Button } from "@/components/ui/button";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import {
  canSeeCours,
  canSeeThematique,
  visibleItems,
} from "@/lib/content-access";
import { getCoursBySlug, getCoursOutline } from "@/lib/db/queries/cours";
import { getCompletedRessourceIds } from "@/lib/db/queries/progress";
import { getStudentRoadmap } from "@/lib/db/queries/roadmap";
import { defaultDescription, siteOpenGraph } from "@/lib/metadata";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const [found, access] = await Promise.all([
    getCoursBySlug(slug),
    getContentAccess(),
  ]);
  const c = found && canSeeCours(access, found.id) ? found : null;
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
  const [found, access] = await Promise.all([
    getCoursBySlug(slug),
    getContentAccess(),
  ]);

  if (!found || !canSeeCours(access, found.id)) notFound();

  const c = {
    ...found,
    thematiques: found.thematiques.filter((t) =>
      canSeeThematique(access, t.id)
    ),
  };
  const profile = await getCurrentProfile();
  const fullOutline = profile ? await getCoursOutline(c.id) : null;
  const outline = fullOutline && {
    ...fullOutline,
    thematiques: fullOutline.thematiques.map((t) =>
      visibleItems(access, { ...t, quiz: [] })
    ),
  };
  const completedIds = profile
    ? await getCompletedRessourceIds(
        profile.id,
        (outline?.thematiques ?? []).flatMap((t) => t.ressources.map((r) => r.id))
      )
    : undefined;

  // Reprise : la prochaine leçon ou le prochain quiz à faire dans ce cours,
  // d'après la feuille de route de l'étudiant (le staff n'en a pas).
  const roadmap =
    profile && !access.all ? await getStudentRoadmap(profile.id, access) : null;
  const roadmapCours = roadmap?.cours.find((r) => r.id === c.id);
  const nextTodo = roadmap?.todo.find((t) => t.coursId === c.id);
  const courseProgress = roadmapCours
    ? roadmapCours.steps.reduce(
        (acc, s) => ({
          completed: acc.completed + s.ressourceProgress.completed,
          total: acc.total + s.ressourceProgress.total,
        }),
        { completed: 0, total: 0 }
      )
    : null;

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
          {courseProgress && courseProgress.total > 0 && (
            <div className="mt-6 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <ProgressIndicator
                  value={(courseProgress.completed / courseProgress.total) * 100}
                  size={20}
                  className="text-sm text-foreground"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {courseProgress.completed}/{courseProgress.total} leçons lues
                </p>
              </div>
              {nextTodo ? (
                <Button
                  render={
                    <Link
                      href={
                        nextTodo.kind === "quiz"
                          ? `/quiz/${nextTodo.id}`
                          : `/ressources/${nextTodo.id}`
                      }
                    />
                  }
                  nativeButton={false}
                  className="max-w-full"
                >
                  <span className="truncate">
                    {courseProgress.completed > 0 ? "Reprendre" : "Commencer"} :{" "}
                    {nextTodo.title}
                  </span>
                  <ArrowRight />
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tu es à jour. La suite s&apos;ouvrira au fil des séances.
                </p>
              )}
            </div>
          )}
          <h2 className="mt-10 font-heading text-xl font-semibold">
            Thématiques
          </h2>
          {c.thematiques.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {access.all
                ? "Aucune thématique pour ce cours pour le moment."
                : "Le contenu de ce cours sera débloqué au fil des séances."}
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
