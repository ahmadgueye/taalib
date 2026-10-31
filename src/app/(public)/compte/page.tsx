import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AccountTabs, type AccountTab } from "@/components/public/account-tabs";
import { EntityCard } from "@/components/public/entity-card";
import { FullNameForm } from "@/components/public/full-name-form";
import { QuranProgressCard } from "@/components/public/quran-progress-card";
import { Badge } from "@/components/ui/badge";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { type ContentAccess } from "@/lib/content-access";
import { getSuiviCours } from "@/lib/db/queries/progress";
import {
  getMemorizationStatus,
} from "@/lib/db/queries/quran-memorization";
import { getQuizAttemptsSummary } from "@/lib/db/queries/quiz-tentatives";
import { getStudentRoadmap } from "@/lib/db/queries/roadmap";
import { getChapters } from "@/lib/quran/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mon compte — Taalib",
  robots: { index: false, follow: false },
};

type CoursSuivi = {
  id: string;
  slug: string;
  title: string;
  completed: number;
  total: number;
};

// Pour un étudiant, les cours de sa feuille de route : tous ceux de ses
// classes (même sans leçon lue), dans le même ordre et avec le même décompte
// (toutes les leçons publiées, débloquées ou non) que l'accueil. Le staff n'a
// pas de feuille de route : on garde les cours où il a lu quelque chose.
async function getCoursSuivis(
  userId: string,
  access: ContentAccess
): Promise<CoursSuivi[]> {
  if (access.all) {
    const suivi = await getSuiviCours(userId, access);
    return suivi.map(({ cours, completedCount, totalRessources }) => ({
      id: cours.id,
      slug: cours.slug,
      title: cours.title,
      completed: completedCount,
      total: totalRessources,
    }));
  }
  const { cours } = await getStudentRoadmap(userId, access);
  return cours.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    completed: c.steps.reduce((n, s) => n + s.ressourceProgress.completed, 0),
    total: c.steps.reduce((n, s) => n + s.ressourceProgress.total, 0),
  }));
}

type Props = {
  searchParams: Promise<{ next?: string; onglet?: string }>;
};

export default async function ComptePage({ searchParams }: Props) {
  const { next, onglet } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/compte");

  const [suivi, quizAttempts, chapters, statusMap] = await Promise.all([
    getContentAccess().then((access) => getCoursSuivis(profile.id, access)),
    getQuizAttemptsSummary(profile.id),
    getChapters(),
    getMemorizationStatus(profile.id),
  ]);

  // Sans nom, l'étudiant arrive ici pour compléter son profil : on ouvre
  // directement les paramètres.
  const defaultTab: AccountTab =
    onglet === "parametres" || !profile.fullName ? "parametres" : "progression";

  const progression = (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="font-heading text-xl font-semibold">Cours suivis</h2>
        {suivi.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Tu ne suis encore aucun cours.{" "}
            <Link href="/rejoindre" className="underline underline-offset-2">
              Rejoindre une classe
            </Link>
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {suivi.map((c) => (
              <EntityCard
                key={c.id}
                href={`/cours/${c.slug}`}
                title={c.title}
                description={
                  c.total > 0
                    ? `${c.completed}/${c.total} leçons lues`
                    : "Le contenu de ce cours arrive bientôt."
                }
                progress={
                  c.total > 0 ? (c.completed / c.total) * 100 : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-heading text-xl font-semibold">Coran</h2>
        <div className="mt-4">
          <QuranProgressCard chapters={chapters} statusMap={statusMap} />
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl font-semibold">Quiz</h2>
        {quizAttempts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Tu n&apos;as pas encore passé de quiz.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {quizAttempts.map(
              ({ quiz, bestScore, bestTotal, attemptsCount }) => {
                const passed =
                  (bestScore / bestTotal) * 100 >= quiz.passingScore;
                return (
                  <Link
                    key={quiz.id}
                    href={`/quiz/${quiz.id}/historique`}
                    className="flex items-center justify-between gap-2 border p-4 transition-colors hover:bg-muted"
                  >
                    <div>
                      <span className="font-medium">{quiz.title}</span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {quiz.thematique.title} · {attemptsCount} tentative
                        {attemptsCount > 1 ? "s" : ""}
                      </p>
                    </div>
                    {/* Pas encore réussi : neutre plutôt qu'un rouge qui
                        sanctionne, l'étudiant peut retenter. */}
                    <Badge
                      variant={passed ? "default" : "outline"}
                      className={cn(
                        "tabular-nums",
                        passed && "bg-emerald-600 text-white dark:bg-emerald-500"
                      )}
                    >
                      {bestScore}/{bestTotal}
                    </Badge>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );

  const parametres = (
    <div className="flex flex-col divide-y border-y">
      <section className="py-6">
        <h2 className="font-heading text-lg font-semibold">Profil</h2>
        {!profile.fullName && (
          <p className="mt-2 text-sm text-muted-foreground">
            Ajoute ton nom pour compléter ton profil.
          </p>
        )}
        <div className="mt-4">
          <FullNameForm
            defaultValue={profile.fullName ?? undefined}
            next={next ?? "/compte?onglet=parametres"}
          />
        </div>
        <p className="mt-6 text-sm font-medium">E-mail</p>
        <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
      </section>

      <section className="flex items-center justify-between gap-4 py-6">
        <div>
          <h2 className="font-heading text-lg font-semibold">Apparence</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Thème clair ou sombre.
          </p>
        </div>
        <ThemeToggle />
      </section>

      <section className="flex items-center justify-between gap-4 py-6">
        <div>
          <h2 className="font-heading text-lg font-semibold">Session</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Te déconnecter de cet appareil.
          </p>
        </div>
        <SignOutButton />
      </section>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Mon compte
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {profile.fullName ? `${profile.fullName} · ${profile.email}` : profile.email}
      </p>
      <AccountTabs
        defaultTab={defaultTab}
        progression={progression}
        parametres={parametres}
      />
    </div>
  );
}
