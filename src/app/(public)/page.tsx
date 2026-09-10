import Link from "next/link";

import { EntityCard } from "@/components/public/entity-card";
import { ParcoursTrack } from "@/components/public/parcours-track";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { coursStatusConfig } from "@/lib/cours-status";
import { getAllCours } from "@/lib/db/queries/cours";
import {
  getFirstParcours,
  getParcoursProgress,
  getThematiquesHorsParcours,
} from "@/lib/db/queries/parcours";

export default async function Home() {
  const profile = await getCurrentProfile();
  const parcours = await getFirstParcours();

  if (!parcours) {
    const coursList = await getAllCours();
    return (
      <div className="flex flex-col gap-16 animate-in fade-in duration-300">
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

  const [steps, thematiquesLibres] = await Promise.all([
    getParcoursProgress(parcours, profile?.id ?? null),
    getThematiquesHorsParcours(parcours.id),
  ]);

  return (
    <div className="flex flex-col gap-16 animate-in fade-in duration-300">
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
            {!profile && (
              <Link
                href="/login"
                className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
              >
                Se connecter pour commencer →
              </Link>
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
