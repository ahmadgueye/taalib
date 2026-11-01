import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, TriangleAlert } from "lucide-react";

import { MemorizationDashboard } from "@/components/public/memorization-dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { INACTIVE_AFTER_DAYS, isInactive } from "@/lib/class-progress";
import {
  getClassProgress,
  getRessourceCompletionDates,
} from "@/lib/db/queries/class-progress";
import { getClassById, getClassCoursOutline } from "@/lib/db/queries/classes";
import {
  getMemorizationStatus,
  getRecentChapterActivity,
} from "@/lib/db/queries/quran-memorization";
import { getQuizScores } from "@/lib/db/queries/quiz-tentatives";
import { computeChapterMemorizationSummaries } from "@/lib/quran/memorization";
import { getChapters } from "@/lib/quran/queries";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string; userId: string }>;
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

function formatPercent(value: number) {
  return value > 0 && value < 10 ? value.toFixed(1) : String(Math.round(value));
}

export default async function ClassStudentPage({ params }: Props) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const { id, userId } = await params;
  const [classe, progress, outline] = await Promise.all([
    getClassById(id),
    getClassProgress(id),
    getClassCoursOutline(id),
  ]);
  const student = progress.find((s) => s.userId === userId);
  if (!classe || !student) notFound();

  // Ce que l'étudiant voit de la classe : les éléments débloqués, et pour un
  // ancien élève, seulement ceux débloqués avant son départ.
  const visible = (unlockedAt: Date | null): unlockedAt is Date =>
    unlockedAt !== null && (student.leftAt === null || unlockedAt <= student.leftAt);
  const cours = outline
    .map((c) => ({
      ...c,
      thematiques: c.thematiques
        .map((t) => ({
          ...t,
          ressources: t.ressources.filter((r) => visible(r.unlockedAt)),
          quiz: t.quiz.filter((q) => visible(q.unlockedAt)),
        }))
        .filter((t) => t.ressources.length + t.quiz.length > 0),
    }))
    .filter((c) => c.thematiques.length > 0);

  const ressourceIds = cours.flatMap((c) =>
    c.thematiques.flatMap((t) => t.ressources.map((r) => r.id))
  );
  const quizIds = cours.flatMap((c) =>
    c.thematiques.flatMap((t) => t.quiz.map((q) => q.id))
  );
  const [completions, scores, chapters, statusMap, recentActivity] =
    await Promise.all([
      getRessourceCompletionDates(userId, ressourceIds),
      getQuizScores(userId, quizIds),
      getChapters(),
      getMemorizationStatus(userId),
      getRecentChapterActivity(userId),
    ]);

  const now = new Date();
  const inactive = isInactive(student.lastActivityAt, now);
  const trackedChapters = computeChapterMemorizationSummaries(
    chapters,
    statusMap
  ).filter((s) => s.tracked > 0);

  const stats = [
    {
      label: "Leçons lues",
      value: student.lessons.total > 0
        ? `${student.lessons.read}/${student.lessons.total}`
        : "—",
    },
    {
      label: "Quiz réussis",
      value: student.quiz.total > 0
        ? `${student.quiz.passed}/${student.quiz.total}`
        : "—",
      hint:
        student.quiz.averageScore !== null
          ? `moyenne ${Math.round(student.quiz.averageScore)} %`
          : undefined,
    },
    {
      label: "Coran mémorisé",
      value: `${formatPercent(student.quran.percent)} %`,
    },
    {
      label: "Dernière activité",
      value: student.lastActivityAt
        ? dateFormat.format(student.lastActivityAt)
        : "Jamais",
      warning: inactive,
    },
  ];

  return (
    <div>
      <Link
        href={`/dashboard/classes/${classe.id}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {classe.name}
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">
        {student.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {student.email}
        {student.leftAt &&
          ` · ancien élève depuis le ${dateFormat.format(student.leftAt)}`}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle
                className={cn(
                  "flex items-center gap-2 font-heading text-2xl",
                  s.warning && "text-amber-600"
                )}
              >
                {s.value}
                {s.warning && (
                  <TriangleAlert
                    className="size-5"
                    aria-label={`Aucune activité depuis plus de ${INACTIVE_AFTER_DAYS} jours`}
                  />
                )}
              </CardTitle>
              {s.hint && (
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>

      <section className="mt-10 max-w-3xl">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Cours
        </h2>
        {cours.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Rien n&apos;est encore débloqué pour cet étudiant.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-6">
            {cours.map((c) => (
              <div key={c.id} className="border">
                <p className="border-b px-4 py-3 font-medium">{c.title}</p>
                {c.thematiques.map((t) => (
                  <div key={t.id} className="border-b px-4 py-3 last:border-b-0">
                    <p className="text-sm font-medium">{t.title}</p>
                    <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                      {t.ressources.map((r) => {
                        const readAt = completions.get(r.id);
                        return (
                          <li key={r.id} className="flex items-center justify-between gap-3">
                            <span className={cn(!readAt && "text-muted-foreground")}>
                              {r.title}
                            </span>
                            {readAt ? (
                              <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600">
                                <Check className="size-3.5" />
                                lue le {dateFormat.format(readAt)}
                              </span>
                            ) : (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                à lire
                              </span>
                            )}
                          </li>
                        );
                      })}
                      {t.quiz.map((q) => {
                        const score = scores.get(q.id);
                        const percent = score
                          ? (score.bestScore / score.bestTotal) * 100
                          : null;
                        const passed =
                          percent !== null && percent >= q.passingScore;
                        return (
                          <li key={q.id} className="flex items-center justify-between gap-3">
                            <span className={cn(!score && "text-muted-foreground")}>
                              Quiz · {q.title}
                            </span>
                            {score ? (
                              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                {score.attemptsCount} tentative
                                {score.attemptsCount > 1 ? "s" : ""}
                                <Badge
                                  className={cn(
                                    passed
                                      ? "bg-emerald-600 text-white dark:bg-emerald-500"
                                      : "bg-destructive text-white"
                                  )}
                                >
                                  {score.bestScore}/{score.bestTotal}
                                </Badge>
                              </span>
                            ) : (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                pas tenté
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Mémorisation du Coran
        </h2>
        <div className="mt-4">
          <MemorizationDashboard
            chapters={chapters}
            statusMap={statusMap}
            recentActivity={recentActivity}
          />
        </div>
        {trackedChapters.length > 0 && (
          <div className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {trackedChapters.map((s) => (
              <div key={s.chapter.id} className="text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span>
                    {s.chapter.id}. {s.chapter.nameSimple}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {s.maitrise}/{s.chapter.versesCount}
                    {s.aRenforcer > 0 && (
                      <span className="text-rose-600"> · {s.aRenforcer} à renforcer</span>
                    )}
                  </span>
                </div>
                <div className="mt-1 flex h-1 bg-muted">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${(s.maitrise / s.chapter.versesCount) * 100}%` }}
                  />
                  <div
                    className="bg-rose-500"
                    style={{ width: `${(s.aRenforcer / s.chapter.versesCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
