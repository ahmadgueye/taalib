import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MoveRight } from "lucide-react";

import { BackButton } from "@/components/public/back-button";
import { ProgressIndicator } from "@/components/public/progress-indicator";
import { RessourcesHadithsTabs } from "@/components/public/ressources-hadiths-tabs";
import { Button } from "@/components/ui/button";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import {
  canSeeQuiz,
  canSeeRessource,
  canSeeThematique,
  showsUpcoming,
} from "@/lib/content-access";
import { certificatePath } from "@/lib/certificates";
import { getCertificateForThematique } from "@/lib/db/queries/certificates";
import { getCompletedRessourceIds } from "@/lib/db/queries/progress";
import { getQuizScores } from "@/lib/db/queries/quiz-tentatives";
import { getThematiqueBySlug } from "@/lib/db/queries/thematiques";
import { defaultDescription, siteOpenGraph } from "@/lib/metadata";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [found, access] = await Promise.all([
    getThematiqueBySlug(slug),
    getContentAccess(),
  ]);
  const t = found && canSeeThematique(access, found.id) ? found : null;
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
  const [found, access] = await Promise.all([
    getThematiqueBySlug(slug),
    getContentAccess(),
  ]);

  if (!found || !canSeeThematique(access, found.id)) notFound();

  // Tout le programme de la thématique est listé, débloqué ou non, pour que
  // l'étudiant voie ce qui lui reste. Côté verrouillé, seuls le titre et le
  // type partent vers le navigateur : jamais le contenu ni son aperçu. Un
  // ancien élève ne voit que ce qui lui avait été ouvert.
  const upcoming = showsUpcoming(access, found.cours.id);
  const t = {
    ...found,
    ressources: found.ressources
      .filter((r) => upcoming || canSeeRessource(access, r.id))
      .map((r) =>
        canSeeRessource(access, r.id)
          ? {
              id: r.id,
              title: r.title,
              type: r.type,
              url: r.url,
              description: r.description,
              locked: false,
            }
          : {
              id: r.id,
              title: r.title,
              type: r.type,
              url: null,
              description: null,
              locked: true,
            }
      ),
    quiz: found.quiz
      .filter((q) => upcoming || canSeeQuiz(access, q.id))
      .map((q) =>
        canSeeQuiz(access, q.id)
          ? { ...q, locked: false }
          : {
              id: q.id,
              title: q.title,
              description: null,
              passingScore: q.passingScore,
              questions: [],
              locked: true,
            }
      ),
  };

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
  const certificate = profile
    ? await getCertificateForThematique(profile.id, t.id)
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

      {certificate && <ValidatedBanner certificate={certificate} />}

      <RessourcesHadithsTabs
        ressources={t.ressources}
        hadiths={t.hadiths}
        quiz={t.quiz}
        coursTitle={t.cours.title}
        completedIds={completedIds}
        quizScores={quizScores}
      />
    </div>
  );
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Thématique validée : rappel en tête de page, avec le lien vers la page
// publique du certificat.
function ValidatedBanner({
  certificate,
}: {
  certificate: { code: string; issuedAt: Date };
}) {
  return (
    <section
      aria-labelledby="thematique-validee"
      className="mt-6 flex flex-wrap items-center gap-4 bg-[#21140f] p-4 text-[#f5f5ed] sm:px-5 dark:bg-card"
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 rotate-45 items-center justify-center border-2 border-chart-1"
      >
        <Check className="size-4 -rotate-45 text-chart-1" strokeWidth={3} />
      </span>
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-0.5">
        <p className="text-[11px] font-bold tracking-[0.1em] uppercase opacity-75">
          Thématique validée
        </p>
        <h2 id="thematique-validee" className="font-semibold">
          Bravo, tu as tout lu et réussi tous les quiz.
        </h2>
        <p className="text-sm opacity-75">
          Certificat {certificate.code} · {dateFormat.format(certificate.issuedAt)}
        </p>
      </div>
      {/* Orange dans les deux thèmes, comme « Reprendre » sur /compte. */}
      <Button
        size="lg"
        render={<Link href={certificatePath(certificate.code)} />}
        nativeButton={false}
        className="bg-chart-1 text-white hover:bg-chart-1/80"
      >
        Voir mon certificat
        <MoveRight />
      </Button>
    </section>
  );
}
