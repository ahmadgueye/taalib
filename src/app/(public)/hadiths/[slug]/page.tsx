import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/public/back-button";
import { MarkdownContent } from "@/components/public/markdown-content";
import { getContentAccess } from "@/lib/auth/content-access";
import { canSeeThematique } from "@/lib/content-access";
import { getHadithBySlug } from "@/lib/db/queries/hadiths";
import { formatNarrators } from "@/lib/narrators";
import { defaultDescription, siteOpenGraph } from "@/lib/metadata";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [found, access] = await Promise.all([
    getHadithBySlug(slug),
    getContentAccess(),
  ]);
  const h = found && canSeeThematique(access, found.thematiqueId) ? found : null;
  const title = h?.title ?? "Hadith";
  const description = h?.translationFr ?? defaultDescription;
  return {
    title: `${title} — Taalib`,
    description,
    openGraph: { ...siteOpenGraph, title, description },
  };
}

export default async function HadithDetailPage({ params }: Props) {
  const { slug } = await params;
  const [h, access] = await Promise.all([
    getHadithBySlug(slug),
    getContentAccess(),
  ]);

  if (!h || !canSeeThematique(access, h.thematiqueId)) notFound();

  return (
    <div className="animate-in fade-in duration-300">
      <BackButton />
      <nav className="mt-3 text-sm text-muted-foreground">
        <Link href="/hadiths" className="hover:text-foreground">
          Hadiths
        </Link>{" "}
        /{" "}
        <Link
          href={`/thematiques/${h.thematique.slug}`}
          className="hover:text-foreground"
        >
          {h.thematique.cours.title} · {h.thematique.title}
        </Link>{" "}
        / <span className="text-foreground">{h.title}</span>
      </nav>

      <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">
        {h.title}
      </h1>

      <Link
        href={`/thematiques/${h.thematique.slug}`}
        className="mt-3 inline-block"
      >
        <Badge variant="outline" className="hover:bg-muted">
          {h.thematique.cours.title} · {h.thematique.title}
        </Badge>
      </Link>

      <div className="mt-6 text-sm text-muted-foreground">
        <p>Rapporteur(s) : {formatNarrators(h.hadithNarrators)}</p>
        {h.source && <p className="mt-1">Source : {h.source}</p>}
      </div>

      <p className="mt-6 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Arabe
      </p>
      <MarkdownContent
        content={h.arabicText}
        dir="rtl"
        lang="ar"
        className="mt-2 max-w-none font-arabic text-2xl leading-loose text-right"
      />

      <p className="mt-6 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Français
      </p>
      <MarkdownContent
        content={h.translationFr}
        className="mt-2 max-w-none text-muted-foreground"
      />

      {h.translationWolof && (
        <>
          <p className="mt-6 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Wolof
          </p>
          <MarkdownContent
            content={h.translationWolof}
            className="mt-2 max-w-none text-muted-foreground"
          />
        </>
      )}
      {/* <div className="mt-6 text-sm text-muted-foreground">
        <p>Rapporteur(s) : {formatNarrators(h.hadithNarrators)}</p>
        {h.source && <p className="mt-1">Source : {h.source}</p>}
      </div> */}
    </div>
  );
}
