import Link from "next/link";

import { EntityCard } from "@/components/public/entity-card";
import { ParcoursTrack } from "@/components/public/parcours-track";
import { WelcomeToast } from "@/components/public/welcome-toast";
import { Button } from "@/components/ui/button";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { canSeeCours, canSeeThematique } from "@/lib/content-access";
import { coursStatusConfig } from "@/lib/cours-status";
import { getAllCours } from "@/lib/db/queries/cours";
import {
  getFirstParcours,
  getParcoursProgress,
  getThematiquesHorsParcours,
  visibleParcours,
} from "@/lib/db/queries/parcours";

type Props = {
  searchParams: Promise<{ welcome?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const { welcome } = await searchParams;
  const showWelcome = welcome === "1";
  const profile = await getCurrentProfile();

  // Le contenu est réservé aux étudiants de l'institut : un visiteur ne voit
  // qu'une vitrine.
  if (!profile) return <Vitrine />;

  const access = await getContentAccess();
  if (!access.all && access.coursIds.size === 0) {
    return <SansClasse showWelcome={showWelcome} />;
  }

  const firstParcours = await getFirstParcours();
  const parcours = firstParcours && visibleParcours(access, firstParcours);

  if (!parcours || parcours.etapes.length === 0) {
    const coursList = (await getAllCours()).filter((c) =>
      canSeeCours(access, c.id)
    );
    return (
      <div className="flex flex-col gap-16 animate-in fade-in duration-300">
        <WelcomeToast show={showWelcome} />
        <section className="max-w-2xl">
          <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            Des ressources authentiques pour apprendre l&apos;Islam, toujours
            à leur place.
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Basée sur le Qur&apos;an et la Sunnah. Accessible à tous,
            facilement.
          </p>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold">Cours</h2>
            <Link
              href="/cours"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Voir tout →
            </Link>
          </div>
          {coursList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun cours pour le moment.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {coursList.map((c) => (
                <EntityCard
                  key={c.id}
                  href={`/cours/${c.slug}`}
                  title={c.title}
                  description={c.description}
                  badge={
                    c.status === "coming_soon"
                      ? coursStatusConfig.coming_soon
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  const [steps, allThematiquesLibres] = await Promise.all([
    getParcoursProgress(parcours, profile.id),
    getThematiquesHorsParcours(parcours.id),
  ]);
  const thematiquesLibres = allThematiquesLibres.filter((t) =>
    canSeeThematique(access, t.id)
  );

  return (
    <div className="flex flex-col gap-16 animate-in fade-in duration-300">
      <WelcomeToast show={showWelcome} />
      <section>
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
              {parcours.title}
            </h1>
            {parcours.description && (
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                {parcours.description}
              </p>
            )}
          </div>
          <Link
            href="/parcours"
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
          >
            Tous les parcours →
          </Link>
        </div>

        <div className="mt-8">
          <ParcoursTrack steps={steps} />
        </div>
      </section>

      {thematiquesLibres.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold">
              Hors parcours
            </h2>
            <Link
              href="/cours"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Voir tout →
            </Link>
          </div>
          <p className="mb-4 -mt-2 text-sm text-muted-foreground">
            Ces thématiques restent accessibles librement, sans ordre imposé.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {thematiquesLibres.map((t) => (
              <EntityCard
                key={t.id}
                href={`/thematiques/${t.slug}`}
                title={t.title}
                description={t.description}
                badge={
                  t.cours.status === "coming_soon"
                    ? coursStatusConfig.coming_soon
                    : { label: t.cours.title, variant: "outline" }
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Vitrine() {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-300">
      <section className="max-w-2xl">
        <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
          Des ressources authentiques pour apprendre l&apos;Islam, toujours
          à leur place.
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Basée sur le Qur&apos;an et la Sunnah. Les cours sont réservés aux
          étudiants de l&apos;institut ; le Coran reste ouvert à tous.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button render={<Link href="/login" />} nativeButton={false}>
            Se connecter
          </Button>
          <Button
            render={<Link href="/rejoindre" />}
            nativeButton={false}
            variant="outline"
          >
            Rejoindre une classe
          </Button>
          <Button
            render={<Link href="/coran" />}
            nativeButton={false}
            variant="ghost"
          >
            Lire le Coran →
          </Button>
        </div>
      </section>
    </div>
  );
}

function SansClasse({ showWelcome }: { showWelcome: boolean }) {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-300">
      <WelcomeToast show={showWelcome} />
      <section className="max-w-2xl">
        <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-balance">
          Bienvenue sur Taalib
        </h1>
        <p className="mt-4 text-muted-foreground">
          Tu ne fais encore partie d&apos;aucune classe. Saisis le code
          d&apos;invitation donné par ton enseignant pour accéder à tes cours.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button render={<Link href="/rejoindre" />} nativeButton={false}>
            Rejoindre une classe
          </Button>
          <Button
            render={<Link href="/coran" />}
            nativeButton={false}
            variant="ghost"
          >
            Lire le Coran →
          </Button>
        </div>
      </section>
    </div>
  );
}
