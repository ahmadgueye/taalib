import Link from "next/link";
import { redirect } from "next/navigation";

import { CourseCard } from "@/components/public/course-card";
import { CourseProgress } from "@/components/public/course-progress";
import { RoadmapTrack } from "@/components/public/roadmap-track";
import { TodoList } from "@/components/public/todo-list";
import { WelcomeToast } from "@/components/public/welcome-toast";
import { Button } from "@/components/ui/button";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import {
  certificateCodesByThematique,
  completedThematiqueIds,
  getCertificatesForUser,
  issueCertificates,
} from "@/lib/db/queries/certificates";
import { getAllCoursWithCounts } from "@/lib/db/queries/cours";
import { getStudentRoadmap } from "@/lib/db/queries/roadmap";
import { isProfileComplete } from "@/lib/profile-info";

type Props = {
  searchParams: Promise<{ welcome?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const { welcome } = await searchParams;
  const showWelcome = welcome === "1";
  const profile = await getCurrentProfile();

  // Un visiteur est envoyé sur /login par le proxy ; ceci couvre une
  // session expirée entre-temps.
  if (!profile) redirect("/login");
  // Un étudiant inscrit avant l'ajout des informations du profil les
  // complète d'abord (voir /bienvenue).
  if (!isProfileComplete(profile)) redirect("/bienvenue");

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

  // Rattrape une thématique terminée sans action de l'étudiant (l'enseignant
  // a retiré la dernière leçon qui restait, par exemple).
  await issueCertificates(profile.id, completedThematiqueIds(roadmap));
  const certificateCodes = certificateCodesByThematique(
    await getCertificatesForUser(profile.id)
  );

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
            <RoadmapTrack steps={c.steps} certificateCodes={certificateCodes} />
          )}
        </section>
      ))}
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
