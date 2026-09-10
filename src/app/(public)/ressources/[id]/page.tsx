import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/public/back-button";
import { NextChapterButton } from "@/components/public/next-chapter-button";
import { PdfEmbed } from "@/components/public/pdf-embed";
import { ResourceCourseNav } from "@/components/public/resource-course-nav";
import { ExternalLinkCard } from "@/components/public/external-link-card";
import { ResourceViewerShell } from "@/components/public/resource-viewer-shell";
import { TextResourceReader } from "@/components/public/text-resource-reader";
import { VideoEmbed } from "@/components/public/video-embed";
import { getCoursOutline } from "@/lib/db/queries/cours";
import { getPublishedRessourceById } from "@/lib/db/queries/ressources";
import {
  defaultDescription,
  siteOpenGraph,
  stripMarkdown,
} from "@/lib/metadata";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = await getPublishedRessourceById(id);
  const title = r?.title ?? "Ressource";
  const description = r?.content
    ? stripMarkdown(r.content)
    : defaultDescription;
  return {
    title: `${title} — Taalib`,
    description,
    openGraph: { ...siteOpenGraph, title, description },
  };
}

export default async function RessourceDetailPage({ params }: Props) {
  const { id } = await params;
  const r = await getPublishedRessourceById(id);

  if (!r) notFound();
  if (r.type === "texte" && !r.content) notFound();

  const outline = await getCoursOutline(r.thematique.cours.id);
  const thematiques = (outline?.thematiques ?? []).map((thematique) => ({
    id: thematique.id,
    title: thematique.title,
    ressources: thematique.ressources.map((ressource) => ({
      id: ressource.id,
      title: ressource.title,
      type: ressource.type,
    })),
  }));

  const allRessources = thematiques.flatMap(
    (thematique) => thematique.ressources,
  );
  const currentIndex = allRessources.findIndex(
    (ressource) => ressource.id === r.id,
  );
  const prev =
    currentIndex > 0
      ? {
          id: allRessources[currentIndex - 1].id,
          title: allRessources[currentIndex - 1].title,
        }
      : null;
  const next =
    currentIndex >= 0 && currentIndex < allRessources.length - 1
      ? {
          id: allRessources[currentIndex + 1].id,
          title: allRessources[currentIndex + 1].title,
        }
      : null;

  const thematiqueRessources = r.thematique.ressources;
  const thematiqueIndex = thematiqueRessources.findIndex(
    (ressource) => ressource.id === r.id,
  );
  const nextInThematique = thematiqueRessources[thematiqueIndex + 1] ?? null;
  const examQuiz = r.thematique.quiz[0] ?? null;

  const nextAction = nextInThematique
    ? { href: `/ressources/${nextInThematique.id}`, label: "Chapitre suivant" }
    : examQuiz
      ? { href: `/quiz/${examQuiz.id}`, label: "Passer à l'examen" }
      : {
          href: `/thematiques/${r.thematique.slug}`,
          label: "Terminer la thématique",
        };

  const courseNav = (
    <ResourceCourseNav
      coursTitle={r.thematique.cours.title}
      coursSlug={r.thematique.cours.slug}
      thematiques={thematiques}
      currentRessourceId={r.id}
      prev={prev}
      next={next}
    />
  );
  const footerAction = (
    <NextChapterButton
      ressourceId={r.id}
      href={nextAction.href}
      label={nextAction.label}
    />
  );

  return (
    <div className="animate-in fade-in duration-300">
      <BackButton />
      <nav className="mt-3 text-sm text-muted-foreground">
        <Link
          href={`/thematiques/${r.thematique.slug}`}
          className="hover:text-foreground"
        >
          {r.thematique.cours.title} · {r.thematique.title}
        </Link>{" "}
        / <span className="text-foreground">{r.title}</span>
      </nav>

      <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">
        {r.title}
      </h1>
      {r.description && (
        <p className="mt-2 text-muted-foreground">{r.description}</p>
      )}

      <div className="mt-6">
        {r.type === "texte" && r.content ? (
          <TextResourceReader
            content={r.content}
            courseNav={courseNav}
            footerAction={footerAction}
          />
        ) : (
          <ResourceViewerShell courseNav={courseNav} footerAction={footerAction}>
            {r.type === "video" && r.url && <VideoEmbed url={r.url} />}
            {r.type === "pdf" && r.url && (
              <PdfEmbed url={r.url} title={r.title} />
            )}
            {r.type === "lien" && r.url && (
              <ExternalLinkCard url={r.url} label="Ouvrir le lien" />
            )}
          </ResourceViewerShell>
        )}
      </div>
    </div>
  );
}
