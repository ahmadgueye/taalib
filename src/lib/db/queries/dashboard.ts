import { count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  cours,
  hadiths,
  profiles,
  quiz,
  ressources,
  seances,
  thematiques,
} from "@/lib/db/schema";

// Ce qui attend une action du staff, pour l'accueil du dashboard. Les
// demandes d'accès ne concernent que l'admin : l'appelant le précise.
export async function getDashboardTodo({ isAdmin }: { isAdmin: boolean }) {
  const [[draftRessources], [draftQuiz], [comingSoonCours], [pendingViewers]] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(ressources)
        .where(eq(ressources.status, "draft")),
      db.select({ value: count() }).from(quiz).where(eq(quiz.status, "draft")),
      db
        .select({ value: count() })
        .from(cours)
        .where(eq(cours.status, "coming_soon")),
      isAdmin
        ? db
            .select({ value: count() })
            .from(profiles)
            .where(eq(profiles.role, "viewer"))
        : Promise.resolve([{ value: 0 }]),
    ]);

  return {
    draftRessources: draftRessources.value,
    draftQuiz: draftQuiz.value,
    comingSoonCours: comingSoonCours.value,
    pendingViewers: pendingViewers.value,
  };
}

export type RecentEdit = {
  kind: "cours" | "thematique" | "ressource" | "quiz" | "hadith" | "seance";
  id: string;
  title: string;
  updatedAt: Date;
  href: string;
};

// Derniers éléments créés ou modifiés, toutes entités confondues, avec un
// lien vers leur édition pour reprendre là où on s'est arrêté.
export async function getRecentEdits(limit: number): Promise<RecentEdit[]> {
  const pick = { id: true, title: true, updatedAt: true } as const;
  const [c, t, r, q, h, s] = await Promise.all([
    db.query.cours.findMany({
      columns: pick,
      orderBy: [desc(cours.updatedAt)],
      limit,
    }),
    db.query.thematiques.findMany({
      columns: pick,
      orderBy: [desc(thematiques.updatedAt)],
      limit,
    }),
    db.query.ressources.findMany({
      columns: pick,
      orderBy: [desc(ressources.updatedAt)],
      limit,
    }),
    db.query.quiz.findMany({
      columns: pick,
      orderBy: [desc(quiz.updatedAt)],
      limit,
    }),
    db.query.hadiths.findMany({
      columns: pick,
      orderBy: [desc(hadiths.updatedAt)],
      limit,
    }),
    db.query.seances.findMany({
      columns: pick,
      orderBy: [desc(seances.updatedAt)],
      limit,
    }),
  ]);

  const edits: RecentEdit[] = [
    ...c.map((x) => ({ ...x, kind: "cours" as const, href: `/dashboard/cours/${x.id}/edit` })),
    ...t.map((x) => ({ ...x, kind: "thematique" as const, href: `/dashboard/thematiques/${x.id}/edit` })),
    ...r.map((x) => ({ ...x, kind: "ressource" as const, href: `/dashboard/ressources/${x.id}/edit` })),
    ...q.map((x) => ({ ...x, kind: "quiz" as const, href: `/dashboard/quiz/${x.id}/edit` })),
    ...h.map((x) => ({ ...x, kind: "hadith" as const, href: `/dashboard/hadiths/${x.id}/edit` })),
    ...s.map((x) => ({ ...x, kind: "seance" as const, href: `/dashboard/seances/${x.id}/edit` })),
  ];

  return edits
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
}
