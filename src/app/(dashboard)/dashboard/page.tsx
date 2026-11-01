import { count } from "drizzle-orm";
import Link from "next/link";
import {
  BookMarked,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  HelpCircle,
  Link as LinkIcon,
  ListTree,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import {
  cours,
  hadiths,
  quiz,
  ressources,
  seances,
  thematiques,
} from "@/lib/db/schema";
import { getAllClasses } from "@/lib/db/queries/classes";
import {
  getDashboardTodo,
  getRecentEdits,
  type RecentEdit,
} from "@/lib/db/queries/dashboard";
import { getUpcomingSeances } from "@/lib/db/queries/seances";
import { formatSeanceDate } from "@/lib/utils";

const createActions = [
  { href: "/dashboard/cours/new", label: "Cours", icon: BookOpen },
  { href: "/dashboard/thematiques/new", label: "Thématique", icon: ListTree },
  { href: "/dashboard/ressources/new", label: "Ressource", icon: LinkIcon },
  { href: "/dashboard/quiz/new", label: "Quiz", icon: HelpCircle },
  { href: "/dashboard/seances/new", label: "Séance", icon: Calendar },
  { href: "/dashboard/hadiths/new", label: "Hadith", icon: BookMarked },
];

const kindLabels: Record<RecentEdit["kind"], string> = {
  cours: "Cours",
  thematique: "Thématique",
  ressource: "Ressource",
  quiz: "Quiz",
  hadith: "Hadith",
  seance: "Séance",
};

const relativeFormat = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

function formatRelative(date: Date, now: Date) {
  const minutes = Math.round((date.getTime() - now.getTime()) / 60000);
  if (Math.abs(minutes) < 60) return relativeFormat.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeFormat.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relativeFormat.format(days, "day");
  return date.toLocaleDateString("fr-FR");
}

function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

function SectionTitle({
  children,
  href,
  linkLabel,
}: {
  children: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="font-heading text-lg font-semibold">{children}</h2>
      {href && (
        <Link
          href={href}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

const rowClass =
  "flex min-w-0 items-center justify-between gap-3 border p-3 text-sm transition-colors hover:bg-muted";

export default async function DashboardHomePage() {
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";
  const now = new Date();

  const [
    todo,
    recentEdits,
    upcomingSeances,
    classList,
    [coursCount],
    [thematiquesCount],
    [ressourcesCount],
    [quizCount],
    [seancesCount],
    [hadithsCount],
  ] = await Promise.all([
    getDashboardTodo({ isAdmin }),
    getRecentEdits(8),
    getUpcomingSeances(3),
    isAdmin ? getAllClasses() : Promise.resolve([]),
    db.select({ value: count() }).from(cours),
    db.select({ value: count() }).from(thematiques),
    db.select({ value: count() }).from(ressources),
    db.select({ value: count() }).from(quiz),
    db.select({ value: count() }).from(seances),
    db.select({ value: count() }).from(hadiths),
  ]);

  const todoItems = [
    {
      count: todo.pendingViewers,
      label: `${plural(todo.pendingViewers, "personne")} en attente d'autorisation`,
      href: "/dashboard/utilisateurs",
    },
    {
      count: todo.draftRessources,
      label: `${plural(todo.draftRessources, "ressource")} en brouillon`,
      href: "/dashboard/ressources?statut=draft",
    },
    {
      count: todo.draftQuiz,
      label: `${plural(todo.draftQuiz, "quiz", "quiz")} en brouillon`,
      href: "/dashboard/quiz?statut=draft",
    },
    {
      count: todo.comingSoonCours,
      label: `${plural(todo.comingSoonCours, "cours", "cours")} « Bientôt disponible »`,
      href: "/dashboard/cours?statut=coming_soon",
    },
  ].filter((t) => t.count > 0);

  const catalogue = [
    { label: "Cours", value: coursCount.value, href: "/dashboard/cours" },
    { label: "Thématiques", value: thematiquesCount.value, href: "/dashboard/cours" },
    { label: "Ressources", value: ressourcesCount.value, href: "/dashboard/ressources" },
    { label: "Quiz", value: quizCount.value, href: "/dashboard/quiz" },
    { label: "Séances", value: seancesCount.value, href: "/dashboard/seances" },
    { label: "Hadiths", value: hadithsCount.value, href: "/dashboard/hadiths" },
  ];

  const firstName = profile?.fullName?.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {firstName ? `Salam, ${firstName}` : "Tableau de bord"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Ce qui demande ton attention et où tu t&apos;es arrêté.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button />}>
            <Plus className="size-4" />
            Créer
            <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {createActions.map(({ href, label, icon: Icon }) => (
              <DropdownMenuItem key={href} render={<Link href={href} />}>
                <Icon />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="flex flex-col gap-10 lg:col-span-2">
          <section>
            <SectionTitle>À traiter</SectionTitle>
            {todoItems.length === 0 ? (
              <p className="mt-3 border border-dashed p-4 text-sm text-muted-foreground">
                Rien en attente, tout est à jour.
              </p>
            ) : (
              <div className="mt-3 grid gap-2">
                {todoItems.map((t) => (
                  <Link key={t.href} href={t.href} className={rowClass}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center bg-primary text-xs font-semibold text-primary-foreground">
                        {t.count}
                      </span>
                      <span className="truncate">{t.label}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle>Modifié récemment</SectionTitle>
            {recentEdits.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Rien pour le moment.
              </p>
            ) : (
              <div className="mt-3 grid gap-2">
                {recentEdits.map((e) => (
                  <Link key={`${e.kind}-${e.id}`} href={e.href} className={rowClass}>
                    <span className="flex min-w-0 items-center gap-3">
                      <Badge variant="secondary" className="w-24 shrink-0 justify-center">
                        {kindLabels[e.kind]}
                      </Badge>
                      <span className="truncate font-medium" title={e.title}>
                        {e.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatRelative(e.updatedAt, now)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-10">
          <section>
            <SectionTitle href="/dashboard/seances" linkLabel="Toutes">
              Prochaines séances
            </SectionTitle>
            {upcomingSeances.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Aucune séance prévue.{" "}
                <Link
                  href="/dashboard/seances/new"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  En planifier une
                </Link>
              </p>
            ) : (
              <div className="mt-3 grid gap-2">
                {upcomingSeances.map((s) => (
                  <Link
                    key={s.id}
                    href={`/dashboard/seances/${s.id}/edit`}
                    className="flex flex-col gap-0.5 border p-3 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="truncate font-medium">{s.title}</span>
                    <span className="text-muted-foreground">
                      {formatSeanceDate(s.sessionDate)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {isAdmin && (
            <section>
              <SectionTitle href="/dashboard/classes" linkLabel="Toutes">
                Classes
              </SectionTitle>
              {classList.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Aucune classe.{" "}
                  <Link
                    href="/dashboard/classes/new"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    En créer une
                  </Link>
                </p>
              ) : (
                <div className="mt-3 grid gap-2">
                  {classList.map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/classes/${c.id}`}
                      className={rowClass}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <GraduationCap className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{c.name}</span>
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {plural(c.memberCount, "étudiant")}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          <section>
            <SectionTitle>Catalogue</SectionTitle>
            <div className="mt-3 grid grid-cols-2 border xl:grid-cols-3">
              {catalogue.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="flex min-w-0 flex-col gap-0.5 p-3 transition-colors hover:bg-muted"
                >
                  <span className="truncate text-xs text-muted-foreground">{s.label}</span>
                  <span className="font-heading text-xl font-semibold">
                    {s.value}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
