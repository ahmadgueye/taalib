import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/public/back-button";
import { ProgressIndicator } from "@/components/public/progress-indicator";
import { RessourcesHadithsTabs } from "@/components/public/ressources-hadiths-tabs";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getCompletedRessourceIds } from "@/lib/db/queries/progress";
import { getQuizScores } from "@/lib/db/queries/quiz-tentatives";
import { getThematiqueBySlug } from "@/lib/db/queries/thematiques";
import { defaultDescription, siteOpenGraph } from "@/lib/metadata";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getThematiqueBySlug(slug);
  const title = t?.title ?? "Thématique";
  const description = t?.description ?? defaultDescription;
  return {
    title: `${title} — Taalib`,
    description,
    openGraph: { ...siteOpenGraph, title, description },
  };
}

export default async function ThematiqueDetailPage({ params }: Props) {
  const { slug } = await params;
  const t = await getThematiqueBySlug(slug);

  if (!t) notFound();

  const profile = await getCurrentProfile();
  const completedIds = profile
    ? await getCompletedRessourceIds(
        profile.id,
        t.ressources.map((r) => r.id)
      )
    : undefined;
  const quizScores = profile
    ? await getQuizScores(
        profile.id,
        t.quiz.map((q) => q.id)
      )
    : undefined;
  const progress =
    completedIds && t.ressources.length > 0
      ? (completedIds.size / t.ressources.length) * 100
      : undefined;

  return (
    <div className="animate-in fade-in duration-300">
      <BackButton />
      <nav className="mt-3 text-sm text-muted-foreground">
        <Link href="/cours" className="hover:text-foreground">
          Cours
        </Link>{" "}
        /{" "}
        <Link href={`/cours/${t.cours.slug}`} className="hover:text-foreground">
          {t.cours.title}
        </Link>{" "}
        / <span className="text-foreground">{t.title}</span>
      </nav>

      <div className="mt-4">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t.title}
        </h1>
        {t.description && (
          <p className="mt-2 text-muted-foreground">{t.description}</p>
        )}
        {progress !== undefined && (
          <ProgressIndicator value={progress} className="mt-3" />
        )}
      </div>

      <RessourcesHadithsTabs
        ressources={t.ressources}
        hadiths={t.hadiths}
        quiz={t.quiz}
        coursTitle={t.cours.title}
        thematiqueTitle={t.title}
        completedIds={completedIds}
        quizScores={quizScores}
      />
    </div>
  );
}
