import { count, eq } from "drizzle-orm";
import Link from "next/link";
import {
  BookMarked,
  BookOpen,
  Calendar,
  Link as LinkIcon,
  ListTree,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import {
  cours,
  hadiths,
  profiles,
  ressources,
  seances,
  thematiques,
} from "@/lib/db/schema";
import { getRecentHadiths } from "@/lib/db/queries/hadiths";
import { getRecentRessources } from "@/lib/db/queries/ressources";
import { getRecentSeances } from "@/lib/db/queries/seances";
import { formatNarrators } from "@/lib/narrators";

const typeLabels = {
  video: "Vidéo",
  pdf: "PDF",
  lien: "Lien",
  texte: "Texte",
};

const quickActions = [
  { href: "/dashboard/cours/new", label: "Nouveau cours", icon: BookOpen },
  {
    href: "/dashboard/thematiques/new",
    label: "Nouvelle thématique",
    icon: ListTree,
  },
  {
    href: "/dashboard/ressources/new",
    label: "Nouvelle ressource",
    icon: LinkIcon,
  },
  { href: "/dashboard/seances/new", label: "Nouvelle séance", icon: Calendar },
  { href: "/dashboard/hadiths/new", label: "Nouveau hadith", icon: BookMarked },
];

export default async function DashboardHomePage() {
  const profile = await getCurrentProfile();

  const [
    [coursCount],
    [thematiquesCount],
    [ressourcesCount],
    [seancesCount],
    [hadithsCount],
    recentRessources,
    recentSeances,
    recentHadiths,
    pendingViewers,
  ] = await Promise.all([
    db.select({ value: count() }).from(cours),
    db.select({ value: count() }).from(thematiques),
    db.select({ value: count() }).from(ressources),
    db.select({ value: count() }).from(seances),
    db.select({ value: count() }).from(hadiths),
    getRecentRessources(5),
    getRecentSeances(5),
    getRecentHadiths(5),
    profile?.role === "admin"
      ? db
          .select({ value: count() })
          .from(profiles)
          .where(eq(profiles.role, "viewer"))
      : Promise.resolve([{ value: 0 }]),
  ]);

  const stats = [
    { label: "Cours", value: coursCount.value, href: "/dashboard/cours" },
    {
      label: "Thématiques",
      value: thematiquesCount.value,
      href: "/dashboard/thematiques",
    },
    {
      label: "Ressources",
      value: ressourcesCount.value,
      href: "/dashboard/ressources",
    },
    { label: "Séances", value: seancesCount.value, href: "/dashboard/seances" },
    { label: "Hadiths", value: hadithsCount.value, href: "/dashboard/hadiths" },
  ];

  const pendingCount = pendingViewers[0]?.value ?? 0;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Tableau de bord
      </h1>
      <p className="mt-1 text-muted-foreground">
        Vue d&apos;ensemble du catalogue.
      </p>

      {profile?.role === "admin" && pendingCount > 0 && (
        <Link href="/dashboard/utilisateurs">
          <Card className="mt-6 border-primary/40 transition-colors hover:bg-muted">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                {pendingCount} personne{pendingCount > 1 ? "s" : ""} en
                attente d&apos;autorisation
              </CardTitle>
              <CardDescription>
                Clique pour gérer les rôles des utilisateurs.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {quickActions.map(({ href, label, icon: Icon }) => (
          <Button
            key={href}
            render={<Link href={href} />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="h-full transition-colors hover:bg-muted">
              <CardHeader>
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="font-heading text-3xl">
                  {s.value}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Ressources récentes
          </h2>
          {recentRessources.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune ressource pour le moment.
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {recentRessources.map((r) => (
                <Link
                  key={r.id}
                  href={`/thematiques/${r.thematique.slug}`}
                  className="flex min-w-0 items-center justify-between gap-2 border p-3 text-sm transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate">{r.title}</span>
                  <Badge variant="secondary" className="shrink-0">
                    {typeLabels[r.type]}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Séances récentes
          </h2>
          {recentSeances.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune séance pour le moment.
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {recentSeances.map((s) => (
                <Link
                  key={s.id}
                  href={`/seances/${s.slug}`}
                  className="flex min-w-0 items-center justify-between gap-2 border p-3 text-sm transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  {s.sessionDate && (
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(s.sessionDate).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold">
          Hadiths récents
        </h2>
        {recentHadiths.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Aucun hadith pour le moment.
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {recentHadiths.map((h) => (
              <Link
                key={h.id}
                href={`/hadiths/${h.slug}`}
                className="flex min-w-0 items-center justify-between gap-2 border p-3 text-sm transition-colors hover:bg-muted"
              >
                <span className="min-w-0 flex-1 truncate">{h.title}</span>
                <span className="shrink-0 truncate text-muted-foreground">
                  {formatNarrators(h.hadithNarrators)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
