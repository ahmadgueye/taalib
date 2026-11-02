import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MoveRight } from "lucide-react";

import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { AccountTabs, type AccountTab } from "@/components/public/account-tabs";
import { FullNameForm } from "@/components/public/full-name-form";
import { QuranProgressCard } from "@/components/public/quran-progress-card";
import { ThemeChoice } from "@/components/public/theme-choice";
import { Button } from "@/components/ui/button";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { type ContentAccess } from "@/lib/content-access";
import { getStudentClasses } from "@/lib/db/queries/classes";
import { getLastReadCoursId, getSuiviCours } from "@/lib/db/queries/progress";
import {
  getMemorizationStatus,
  getRecentChapterActivity,
} from "@/lib/db/queries/quran-memorization";
import { getQuizAttemptsSummary } from "@/lib/db/queries/quiz-tentatives";
import {
  getStudentRoadmap,
  pickResume,
  todoHref,
  type RoadmapTodo,
} from "@/lib/db/queries/roadmap";
import { getChapters } from "@/lib/quran/queries";

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
  access: ContentAccess,
): Promise<{ cours: CoursSuivi[]; todo: RoadmapTodo[] }> {
  if (access.all) {
    const suivi = await getSuiviCours(userId, access);
    return {
      cours: suivi.map(({ cours, completedCount, totalRessources }) => ({
        id: cours.id,
        slug: cours.slug,
        title: cours.title,
        completed: completedCount,
        total: totalRessources,
      })),
      todo: [],
    };
  }
  const { cours, todo } = await getStudentRoadmap(userId, access);
  return {
    cours: cours.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      completed: c.steps.reduce((n, s) => n + s.ressourceProgress.completed, 0),
      total: c.steps.reduce((n, s) => n + s.ressourceProgress.total, 0),
    })),
    todo,
  };
}

function initialsOf(name: string | null, email: string) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return email.slice(0, 1).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function percentOf(completed: number, total: number) {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// À droite du titre : les classes de l'étudiant et où il en est dans chacune.
// Le staff, qui n'est dans aucune classe, ne voit rien.
function ClassBadges({
  classes,
}: {
  classes: Awaited<ReturnType<typeof getStudentClasses>>;
}) {
  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground sm:text-right">
        Tu ne fais partie d&apos;aucune classe pour l&apos;instant.{" "}
        <Link
          href="/rejoindre"
          className="font-semibold text-foreground underline underline-offset-2"
        >
          Rejoindre une classe
        </Link>
      </p>
    );
  }
  return (
    <ul aria-label="Mes classes" className="flex flex-col gap-1 sm:items-end">
      {classes.map((c) => {
        const former = c.leftAt !== null;
        return (
          <li key={c.id} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className={
                former ? "size-2 bg-muted-foreground" : "size-2 bg-emerald-600"
              }
            />
            <span className="font-semibold">{c.name}</span>
            <span className="text-muted-foreground">
              {former
                ? `· Ancien élève depuis le ${dateFormat.format(c.leftAt!)}`
                : `· En cours depuis le ${dateFormat.format(c.joinedAt)}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="font-heading text-2xl font-semibold">
      {children}
    </h2>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

type Props = {
  searchParams: Promise<{ next?: string; onglet?: string }>;
};

export default async function ComptePage({ searchParams }: Props) {
  const { next, onglet } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/compte");

  const access = await getContentAccess();
  const [
    suivi,
    studentClasses,
    lastCoursId,
    quizAttempts,
    chapters,
    statusMap,
    chapterActivity,
  ] = await Promise.all([
    getCoursSuivis(profile.id, access),
    getStudentClasses(profile.id),
    getLastReadCoursId(profile.id),
    getQuizAttemptsSummary(profile.id),
    getChapters(),
    getMemorizationStatus(profile.id),
    getRecentChapterActivity(profile.id),
  ]);

  // Sans nom, l'étudiant arrive ici pour compléter son profil : on ouvre
  // directement les paramètres.
  const defaultTab: AccountTab =
    onglet === "parametres" || !profile.fullName ? "parametres" : "progression";

  const firstName = profile.fullName?.trim().split(/\s+/)[0];
  const initials = initialsOf(profile.fullName, profile.email);

  const resume = pickResume(suivi.todo, lastCoursId);
  const resumeCours = resume
    ? suivi.cours.find((c) => c.id === resume.coursId)
    : undefined;

  const quizzes = quizAttempts.map((a) => ({
    ...a,
    passed: (a.bestScore / a.bestTotal) * 100 >= a.quiz.passingScore,
  }));
  const quizRetry = quizzes.filter((q) => !q.passed);
  const quizPassed = quizzes.filter((q) => q.passed);

  const lastChapterId =
    Object.entries(chapterActivity)
      .sort(([, a], [, b]) => b.localeCompare(a))
      .map(([id]) => Number(id))[0] ?? null;
  const versesMastered = Object.values(statusMap).filter(
    (s) => s === "maitrise",
  ).length;

  const stats = [
    {
      value: suivi.cours.reduce((n, c) => n + c.completed, 0),
      label: "leçons lues",
    },
    { value: versesMastered, label: "versets maîtrisés" },
    {
      value:
        quizzes.length > 0 ? `${quizPassed.length} / ${quizzes.length}` : "0",
      label: "quiz réussis",
    },
  ];

  const progression = (
    <div className="flex flex-col gap-8">
      <ul aria-label="En chiffres" className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <li key={s.label} className="flex flex-col bg-card px-4 py-4 sm:px-5">
            <span className="font-heading text-2xl font-semibold tabular-nums sm:text-3xl">
              {s.value}
            </span>
            <span className="text-xs text-muted-foreground sm:text-sm">
              {s.label}
            </span>
          </li>
        ))}
      </ul>

      {resume && (
        <section
          aria-labelledby="reprendre"
          className="flex flex-wrap items-center justify-between gap-6 bg-[#21140f] p-6 text-[#f5f5ed] sm:p-7 dark:bg-card"
        >
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
            <p className="text-xs font-bold tracking-[0.1em] uppercase opacity-75">
              Reprendre
            </p>
            <h2
              id="reprendre"
              className="font-heading text-2xl leading-tight font-semibold sm:text-3xl"
            >
              {resume.coursTitle}
            </h2>
            <p className="opacity-80">
              {resume.kind === "quiz" ? "Quiz" : resume.thematiqueTitle} ·{" "}
              {resume.title}
            </p>
            {resumeCours && resumeCours.total > 0 && (
              <div className="mt-1 flex max-w-md items-center gap-3">
                <div aria-hidden className="h-1.5 flex-1 bg-[#f5f5ed]/20">
                  <div
                    className="h-full bg-chart-1"
                    style={{
                      width: `${percentOf(resumeCours.completed, resumeCours.total)}%`,
                    }}
                  />
                </div>
                <span className="text-sm tabular-nums opacity-80">
                  {resumeCours.completed} / {resumeCours.total} leçons
                </span>
              </div>
            )}
          </div>
          {/* Orange dans les deux thèmes : le bouton par défaut est marron en
              clair, invisible sur la carte. */}
          <Button
            size="lg"
            render={<Link href={todoHref(resume)} />}
            nativeButton={false}
            className="bg-chart-1 text-white hover:bg-chart-1/80"
          >
            {resume.kind === "quiz" ? "Passer le quiz" : "Continuer la leçon"}
            <MoveRight />
          </Button>
        </section>
      )}

      <div className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-8">
          <section aria-labelledby="cours" className="flex flex-col gap-4">
            <SectionTitle id="cours">Mes cours</SectionTitle>
            {suivi.cours.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tu ne suis encore aucun cours.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {suivi.cours.map((c) => {
                  const pct = percentOf(c.completed, c.total);
                  const done = c.total > 0 && c.completed === c.total;
                  return (
                    <li key={c.id} className="flex">
                      <Link
                        href={`/cours/${c.slug}`}
                        className={
                          c.total > 0
                            ? "flex flex-1 flex-col gap-4 border bg-background p-5 transition-colors hover:bg-muted"
                            : "flex flex-1 flex-col gap-1.5 border border-dashed p-5 transition-colors hover:bg-muted"
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="leading-snug font-semibold">
                            {c.title}
                          </span>
                          {done && (
                            <span className="shrink-0 bg-emerald-700 px-2 py-0.5 text-xs font-bold text-white">
                              Terminé
                            </span>
                          )}
                        </div>
                        {c.total > 0 ? (
                          <div className="mt-auto flex flex-col gap-2">
                            <div aria-hidden className="h-1.5 bg-foreground/10">
                              <div
                                className={
                                  done
                                    ? "h-full bg-emerald-700"
                                    : "h-full bg-chart-1"
                                }
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground tabular-nums">
                              <span>
                                {c.completed} / {c.total} leçons
                              </span>
                              <span className="font-bold text-foreground">
                                {pct} %
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Le contenu de ce cours arrive bientôt.
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="quiz" className="flex flex-col gap-4">
            <SectionTitle id="quiz">Quiz</SectionTitle>
            {quizzes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tu n&apos;as pas encore passé de quiz.
              </p>
            ) : (
              [
                { label: "À retenter", items: quizRetry },
                { label: "Réussis", items: quizPassed },
              ]
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div key={group.label} className="flex flex-col gap-1.5">
                    <Eyebrow>{group.label}</Eyebrow>
                    <ul className="divide-y border bg-background">
                      {group.items.map(
                        ({
                          quiz,
                          bestScore,
                          bestTotal,
                          attemptsCount,
                          passed,
                        }) => (
                          <li key={quiz.id}>
                            <Link
                              href={`/quiz/${quiz.id}/historique`}
                              className="flex items-center justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-muted"
                            >
                              <span className="flex min-w-0 flex-col">
                                <span className="font-medium">
                                  {quiz.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {quiz.thematique.title} · {attemptsCount}{" "}
                                  tentative{attemptsCount > 1 ? "s" : ""}
                                </span>
                              </span>
                              {/* Pas encore réussi : neutre plutôt qu'un rouge
                                  qui sanctionne, l'étudiant peut retenter. */}
                              <span
                                className={
                                  passed
                                    ? "shrink-0 bg-emerald-700 px-2 py-0.5 text-sm font-bold text-white tabular-nums"
                                    : "shrink-0 border border-foreground/30 px-2 py-0.5 text-sm font-bold tabular-nums"
                                }
                              >
                                {bestScore}/{bestTotal}
                              </span>
                            </Link>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                ))
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-8">
          <section aria-labelledby="quran" className="flex flex-col gap-4">
            <SectionTitle id="quran">Qur&apos;an</SectionTitle>
            <QuranProgressCard
              chapters={chapters}
              statusMap={statusMap}
              lastChapterId={lastChapterId}
            />
          </section>
        </div>
      </div>
    </div>
  );

  const parametres = (
    <div className="flex flex-col gap-4">
      <section
        aria-labelledby="profil"
        className="flex flex-col gap-5 bg-card p-6"
      >
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center bg-foreground font-heading text-xl font-semibold text-background"
          >
            {initials}
          </span>
          <div>
            <h2 id="profil" className="font-heading text-xl font-semibold">
              Profil
            </h2>
            <p className="text-sm text-muted-foreground">
              {profile.fullName
                ? "Ton nom tel qu'il apparaît dans tes classes."
                : "Ajoute ton nom pour compléter ton profil."}
            </p>
          </div>
        </div>
        <FullNameForm
          defaultValue={profile.fullName ?? undefined}
          next={next ?? "/compte?onglet=parametres"}
        />
        <div>
          <p className="text-sm font-medium">E-mail</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {profile.email}
          </p>
        </div>
      </section>

      <section
        aria-labelledby="apparence"
        className="flex flex-wrap items-center justify-between gap-4 border px-6 py-5"
      >
        <div>
          <h2 id="apparence" className="font-semibold">
            Apparence
          </h2>
          <p className="text-sm text-muted-foreground">
            Thème clair, sombre ou celui de ton appareil.
          </p>
        </div>
        <ThemeChoice />
      </section>

      <section
        aria-labelledby="session"
        className="flex flex-wrap items-center justify-between gap-4 border px-6 py-5"
      >
        <div>
          <h2 id="session" className="font-semibold">
            Session
          </h2>
          <p className="text-sm text-muted-foreground">
            Te déconnecter de cet appareil.
          </p>
        </div>
        <SignOutButton />
      </section>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300">
      {/* La classe à droite du titre (en dessous sur mobile). */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <Eyebrow>Mon espace</Eyebrow>
          <h1 className="mt-1.5 font-heading text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            {firstName ? `Salam, ${firstName}` : "Salam"}
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            Content de te revoir. Voici où tu en es.
          </p>
        </div>
        {!access.all && <ClassBadges classes={studentClasses} />}
      </div>
      {/* Remonté quand ?onglet= change, pour qu'un lien vers les paramètres
          (menu du compte) ouvre l'onglet même depuis /compte. */}
      <AccountTabs
        key={defaultTab}
        defaultTab={defaultTab}
        progression={progression}
        parametres={parametres}
      />
    </div>
  );
}
