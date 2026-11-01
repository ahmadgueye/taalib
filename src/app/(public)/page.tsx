import Link from "next/link";

import { CourseCard } from "@/components/public/course-card";
import { CourseProgress } from "@/components/public/course-progress";
import { RoadmapTrack } from "@/components/public/roadmap-track";
import { TodoList } from "@/components/public/todo-list";
import { VitrineDoor } from "@/components/public/vitrine-door";
import { VitrineFeatures } from "@/components/public/vitrine-features";
import { WelcomeToast } from "@/components/public/welcome-toast";
import { Button } from "@/components/ui/button";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getAllCoursWithCounts } from "@/lib/db/queries/cours";
import { getStudentRoadmap } from "@/lib/db/queries/roadmap";

type Props = {
  searchParams: Promise<{ welcome?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const { welcome } = await searchParams;
  const showWelcome = welcome === "1";
  const profile = await getCurrentProfile();

  // Le contenu est réservé aux étudiants de Bayān : un visiteur ne voit
  // qu'une vitrine.
  if (!profile) return <Vitrine />;

  const access = await getContentAccess();

  // Le staff n'appartient à aucune classe : il voit le catalogue complet.
  if (access.all) {
    const coursList = await getAllCoursWithCounts();
    return (
      <div className="flex flex-col gap-10 animate-in fade-in duration-300">
        <WelcomeToast show={showWelcome} />
        <section className="max-w-2xl">
          <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            Cours
          </h1>
          <p className="mt-4 text-muted-foreground">
            Les étudiants voient ici leur feuille de route, générée à partir des
            cours de leur classe.
          </p>
        </section>
        {coursList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun cours pour le moment.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {coursList.map((c) => (
              <CourseCard
                key={c.id}
                href={`/cours/${c.slug}`}
                title={c.title}
                arabicTitle={c.arabicTitle}
                description={c.description}
                status={c.status === "coming_soon" ? "coming_soon" : undefined}
                counts={c.counts}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const { cours: roadmap, todo } = await getStudentRoadmap(profile.id, access);
  if (roadmap.length === 0) {
    return (
      <SansClasse showWelcome={showWelcome} inAnyClass={access.inAnyClass} />
    );
  }

  return (
    <div className="flex flex-col gap-12 animate-in fade-in duration-300">
      <WelcomeToast show={showWelcome} />
      <div className="flex flex-col gap-6">
        <section className="max-w-2xl">
          <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            Ma feuille de route
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Ce que tu as appris, où tu en es, et ce qui t&apos;attend. Les
            étapes s&apos;ouvrent au fil des cours.
          </p>
        </section>
        {/* Pleine largeur, hors de l'intro limitée en largeur. */}
        <TodoList todo={todo} />
      </div>

      {roadmap.map((c) => (
        <section key={c.id}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-heading text-xl font-semibold">{c.title}</h2>
            <Link
              href={`/cours/${c.slug}`}
              className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
            >
              Voir le cours →
            </Link>
          </div>
          <CourseProgress steps={c.steps} />
          {c.steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Le contenu de ce cours arrive bientôt.
            </p>
          ) : (
            <RoadmapTrack steps={c.steps} />
          )}
        </section>
      ))}
    </div>
  );
}

const BAYAN_STEPS = [
  { title: "Inscris-toi au programme Bayān", detail: "Sur bayanun.com." },
  {
    title: "Reçois le code de ta classe",
    detail: "Ton enseignant te le transmet.",
  },
  { title: "Entre sur Taalib", detail: "Ta feuille de route t'y attend." },
];

function Vitrine() {
  return (
    <div className="flex flex-col gap-16 animate-in fade-in duration-300">
      <section className="grid items-center gap-6 sm:grid-cols-[1.1fr_0.9fr] sm:gap-10">
        <VitrineDoor className="mx-auto w-full max-w-48 sm:order-last sm:max-w-72" />
        <div className="flex flex-col gap-5">
          <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Apprends avec ta classe, étape par étape.
          </h1>
          <p className="max-w-md text-base text-muted-foreground sm:text-lg">
            Taalib est la plateforme d&apos;apprentissage du programme{" "}
            <span className="font-semibold text-foreground">Bayān</span>. Tes
            cours, tes ressources et tes quiz s&apos;ouvrent au rythme de ta
            classe.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Button
              render={<Link href="/rejoindre" />}
              nativeButton={false}
              size="lg"
            >
              Rejoindre une classe
            </Button>
            <Link
              href="/login"
              className="text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      <VitrineFeatures />

      <section className="grid gap-8 bg-foreground p-6 text-background sm:grid-cols-2 sm:gap-10 sm:p-10 dark:bg-card dark:text-foreground">
        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-2xl font-semibold leading-tight text-balance sm:text-3xl">
            Taalib, la porte d&apos;entrée de Bayān
          </h2>
          <p className="text-background/70 dark:text-muted-foreground">
            <span className="font-semibold text-background dark:text-foreground">
              Bayān
            </span>{" "}
            est le programme.{" "}
            <span className="font-semibold text-background dark:text-foreground">
              Taalib
            </span>{" "}
            est l&apos;endroit où ses étudiants suivent leurs cours, d&apos;une
            leçon à l&apos;autre, avec leur classe.
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <ol className="border-t border-background/15 dark:border-border">
            {BAYAN_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="grid grid-cols-[2rem_1fr] gap-3 border-b border-background/15 py-3 dark:border-border"
              >
                <span className="font-heading text-lg text-chart-1">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-sm text-background/70 dark:text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Button
              render={
                <a
                  href="https://bayanun.com"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              nativeButton={false}
              variant="secondary"
              size="lg"
            >
              Découvrir Bayān
            </Button>
            <Link
              href="/rejoindre"
              className="text-sm font-medium underline decoration-background/30 underline-offset-4 hover:decoration-background dark:decoration-border dark:hover:decoration-foreground"
            >
              J&apos;ai déjà un code
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Deux cas bien distincts pour l'étudiant : pas encore inscrit (il lui faut
// un code), ou inscrit dans une classe qui ne suit encore aucun cours.
function SansClasse({
  showWelcome,
  inAnyClass,
}: {
  showWelcome: boolean;
  inAnyClass: boolean;
}) {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-300">
      <WelcomeToast show={showWelcome} />
      <section className="max-w-2xl">
        <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-balance">
          Bienvenue sur Taalib
        </h1>
        <p className="mt-4 text-muted-foreground">
          {inAnyClass
            ? "Ta classe n'a pas encore de cours. Ton enseignant les ajoutera bientôt."
            : "Tu ne fais encore partie d'aucune classe. Saisis le code d'invitation donné par ton enseignant pour accéder à tes cours."}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {!inAnyClass && (
            <Button render={<Link href="/rejoindre" />} nativeButton={false}>
              Rejoindre une classe
            </Button>
          )}
          <Button
            render={<Link href="/coran" />}
            nativeButton={false}
            variant="ghost"
          >
            Lire le Qur&apos;an →
          </Button>
        </div>
      </section>
    </div>
  );
}
