import type { Metadata } from "next";

import { SeancesTabs } from "@/components/public/seances-tabs";
import { getContentAccess } from "@/lib/auth/content-access";
import { canSeeSeance, type ContentAccess } from "@/lib/content-access";
import { getPastSeances, getUpcomingSeances } from "@/lib/db/queries/seances";

type SeanceWithLinks = Awaited<ReturnType<typeof getPastSeances>>[number];

function visibleSeances(access: ContentAccess, list: SeanceWithLinks[]) {
  return list.filter((s) =>
    canSeeSeance(access, {
      thematiqueIds: s.seanceThematiques.map((t) => t.thematiqueId),
      ressourceIds: s.seanceRessources.map((r) => r.ressourceId),
    })
  );
}

export const metadata: Metadata = {
  title: "Séances de révision — Taalib",
};

export default async function SeancesListPage() {
  const [allUpcoming, allPast, access] = await Promise.all([
    getUpcomingSeances(),
    getPastSeances(),
    getContentAccess(),
  ]);
  const upcoming = visibleSeances(access, allUpcoming);
  const past = visibleSeances(access, allPast);

  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Séances de révision
      </h1>
      <p className="mt-2 text-muted-foreground">
        Thématiques et ressources de chaque séance.
      </p>

      <SeancesTabs upcoming={upcoming} past={past} />
    </div>
  );
}
