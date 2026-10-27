import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CourseCardStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "coming_soon";

const statusLabel: Record<CourseCardStatus, string> = {
  not_started: "Pas commencé",
  in_progress: "En cours",
  completed: "Terminé",
  coming_soon: "Bientôt disponible",
};

function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

// Carte d'un cours sur la page Cours : bandeau avec le nom en arabe (ruq'a),
// statut, contenu, progression et reprise. Les parties propres à l'étudiant
// (progression, reprise) sont facultatives : le staff n'a pas de feuille de
// route.
export function CourseCard({
  href,
  title,
  arabicTitle,
  description,
  status,
  newCount = 0,
  counts,
  progress,
  next,
}: {
  href: string;
  title: string;
  arabicTitle: string | null;
  description: string | null;
  status?: CourseCardStatus;
  newCount?: number;
  counts?: { thematiques: number; lessons: number; quizzes: number };
  progress?: { completed: number; total: number };
  next?: { href: string; label: string };
}) {
  const comingSoon = status === "coming_soon";
  const percent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : null;

  return (
    <article
      className={cn(
        "group relative grid overflow-hidden border transition-colors hover:bg-muted sm:grid-cols-[8rem_minmax(0,1fr)]",
        comingSoon && "border-dashed",
      )}
    >
      <div
        className={cn(
          "flex h-24 items-center justify-center px-4 sm:h-auto sm:min-h-36",
          comingSoon
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground",
        )}
        aria-hidden
      >
        {arabicTitle ? (
          <span lang="ar" dir="rtl" className="font-ruqaa text-4xl leading-none">
            {arabicTitle}
          </span>
        ) : (
          <span className="font-heading text-4xl font-semibold">
            {Array.from(title)[0]}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col p-4">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h2 className="font-heading text-lg font-semibold">
            {/* Toute la carte est cliquable ; le bouton de reprise passe au-dessus. */}
            <Link href={href} className="after:absolute after:inset-0">
              {title}
            </Link>
          </h2>
          {status && (
            <span
              className={cn(
                "shrink-0 border px-1.5 py-0.5 text-xs",
                status === "completed" &&
                  "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400",
                status === "in_progress" && "border-primary text-primary",
                (status === "not_started" || comingSoon) &&
                  "text-muted-foreground",
              )}
            >
              {statusLabel[status]}
              {newCount > 0 &&
                !comingSoon &&
                ` · ${plural(newCount, "nouveauté", "nouveautés")}`}
            </span>
          )}
        </div>

        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}

        {comingSoon ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Ce cours arrive bientôt.
          </p>
        ) : (
          <>
            {counts && (
              <p className="mt-3 text-xs text-muted-foreground">
                {[
                  plural(counts.thematiques, "thématique", "thématiques"),
                  plural(counts.lessons, "leçon", "leçons"),
                  counts.quizzes > 0 && plural(counts.quizzes, "quiz", "quiz"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            {progress &&
              (percent === null ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Le contenu s&apos;ouvrira au fil des séances.
                </p>
              ) : (
                <div className="mt-auto pt-3">
                  <div
                    className="h-1.5 w-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    aria-label={`Progression : ${title}`}
                  >
                    <div
                      className="h-full bg-emerald-600 dark:bg-emerald-400"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {progress.completed}/{progress.total} leçons · {percent} %
                    </span>
                    {next && (
                      <Button
                        size="sm"
                        render={<Link href={next.href} />}
                        nativeButton={false}
                        className="relative z-10 max-w-full"
                      >
                        <span className="truncate">{next.label}</span>
                        <ArrowRight />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    </article>
  );
}
