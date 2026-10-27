import type { Metadata } from "next";
import Link from "next/link";

import {
  CourseCard,
  type CourseCardStatus,
} from "@/components/public/course-card";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { canSeeCours } from "@/lib/content-access";
import { getAllCours, getAllCoursWithCounts } from "@/lib/db/queries/cours";
import { getStudentRoadmap } from "@/lib/db/queries/roadmap";

export const metadata: Metadata = {
  title: "Cours — Taalib",
};

export default async function CoursListPage() {
  const [allCours, access, profile] = await Promise.all([
    getAllCours(),
    getContentAccess(),
    getCurrentProfile(),
  ]);

  // Le staff n'a pas de feuille de route : le catalogue complet, sans
  // progression.
  if (access.all || !profile) {
    const coursList = (await getAllCoursWithCounts()).filter((c) =>
      canSeeCours(access, c.id),
    );
    return (
      <CoursListLayout
        title="Cours"
        intro="Tous les cours du programme."
        empty={coursList.length === 0}
      >
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
      </CoursListLayout>
    );
  }

  // Pour un étudiant : les cours de sa feuille de route, dans l'ordre du
  // programme, avec le même décompte que l'accueil.
  const { cours: roadmap, todo } = await getStudentRoadmap(profile.id, access);
  const byId = new Map(allCours.map((c) => [c.id, c]));

  return (
    <CoursListLayout
      title="Tes cours"
      intro="Les cours de ta classe, dans l'ordre du programme."
      empty={roadmap.length === 0}
    >
      {roadmap.map((r) => {
        const c = byId.get(r.id);
        if (!c) return null;
        const completed = r.steps.reduce(
          (n, s) => n + s.ressourceProgress.completed,
          0,
        );
        const total = r.steps.reduce((n, s) => n + s.ressourceProgress.total, 0);
        const nextTodo = todo.find((t) => t.coursId === r.id);
        const status: CourseCardStatus =
          c.status === "coming_soon"
            ? "coming_soon"
            : r.steps.length > 0 && r.steps.every((s) => s.state === "completed")
              ? "completed"
              : completed > 0
                ? "in_progress"
                : "not_started";

        return (
          <CourseCard
            key={r.id}
            href={`/cours/${r.slug}`}
            title={c.title}
            arabicTitle={c.arabicTitle}
            description={c.description}
            status={status}
            newCount={r.steps.reduce((n, s) => n + s.newCount, 0)}
            counts={{
              thematiques: r.steps.length,
              lessons: total,
              quizzes: r.steps.reduce((n, s) => n + s.quizCount, 0),
            }}
            progress={{ completed, total }}
            next={
              nextTodo && {
                href:
                  nextTodo.kind === "quiz"
                    ? `/quiz/${nextTodo.id}`
                    : `/ressources/${nextTodo.id}`,
                label: `${completed > 0 ? "Reprendre" : "Commencer"} : ${nextTodo.title}`,
              }
            }
          />
        );
      })}
    </CoursListLayout>
  );
}

function CoursListLayout({
  title,
  intro,
  empty,
  children,
}: {
  title: string;
  intro: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="mt-2 text-muted-foreground">{intro}</p>

      {empty ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Tu ne suis encore aucun cours.{" "}
          <Link href="/rejoindre" className="underline underline-offset-2">
            Rejoindre une classe
          </Link>
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">{children}</div>
      )}
    </div>
  );
}
