import Link from "next/link";

import { EntityCard } from "@/components/public/entity-card";
import { RoadmapTrack } from "@/components/public/roadmap-track";
import { TodoList } from "@/components/public/todo-list";
import { WelcomeToast } from "@/components/public/welcome-toast";
import { Button } from "@/components/ui/button";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { coursStatusConfig } from "@/lib/cours-status";
import { getAllCours } from "@/lib/db/queries/cours";
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
    const coursList = await getAllCours();
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
      <section className="max-w-2xl">
        <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
          Ma feuille de route
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Ce que tu as appris, où tu en es, et ce qui t&apos;attend. Les
          étapes s&apos;ouvrent au fil des cours.
        </p>
        <div className="mt-6">
          <TodoList todo={todo} />
        </div>
      </section>

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

function Vitrine() {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-300">
      <section className="max-w-2xl">
        <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
          Taalib
        </h1>
        <p className="mt-2 text-lg sm:text-xl">
          La plateforme de cours du programme{" "}
          <span className="font-semibold">Bayān</span>.
        </p>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Les cours, ressources et quiz sont réservés aux étudiants
          du programme, au rythme de leur classe. Le Coran reste ouvert à
          tous.
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
        <a
          href="https://bayanun.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Découvrir le programme Bayān → bayanun.com
        </a>
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
            Lire le Coran →
          </Button>
        </div>
      </section>
    </div>
  );
}
