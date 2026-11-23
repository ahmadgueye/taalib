import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CircleDashed,
  CircleX,
  RotateCcw,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import {
  getStudentQuizzes,
  type StudentQuiz,
} from "@/lib/db/queries/student-quizzes";
import {
  QUIZ_LIST_FILTERS,
  filterQuizList,
  matchesQuizListFilter,
  parseQuizListFilter,
  type QuizListFilter,
  type QuizListStatus,
} from "@/lib/quiz-list";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Quiz — Taalib",
};

type Props = {
  searchParams: Promise<{ filtre?: string }>;
};

// Tous les quiz débloqués de l'étudiant, filtrés par où il en est : ceux à
// faire d'abord (onglet par défaut), puis réussis et échoués.
export default async function QuizListPage({ searchParams }: Props) {
  const { filtre } = await searchParams;
  const filter = parseQuizListFilter(filtre);

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/quiz");

  const access = await getContentAccess();
  const quizzes = await getStudentQuizzes(profile.id, access);
  const shown = filterQuizList(quizzes, filter);

  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Quiz
      </h1>
      <p className="mt-2 text-muted-foreground">
        Tous les quiz de tes cours, pour savoir lesquels t&apos;attendent.
      </p>

      {quizzes.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Aucun quiz ne t&apos;est encore ouvert. Ils apparaîtront ici au fil
          des cours de ta classe.
          {!access.all && !access.inAnyClass && (
            <>
              {" "}
              <Link href="/rejoindre" className="underline underline-offset-2">
                Rejoindre une classe
              </Link>
            </>
          )}
        </p>
      ) : (
        <>
          <FilterTabs quizzes={quizzes} current={filter} />
          {shown.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              {EMPTY[filter]}
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {shown.map((q) => (
                <QuizRow key={q.id} quiz={q} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

const EMPTY: Record<QuizListFilter, string> = {
  "a-faire": "Rien à faire pour l'instant : tous tes quiz sont réussis.",
  reussis: "Aucun quiz réussi pour l'instant.",
  echoues: "Aucun quiz échoué.",
};

function FilterTabs({
  quizzes,
  current,
}: {
  quizzes: StudentQuiz[];
  current: QuizListFilter;
}) {
  return (
    <nav
      aria-label="Filtrer les quiz"
      className="mt-6 inline-flex rounded-lg bg-muted p-[3px] text-sm"
    >
      {QUIZ_LIST_FILTERS.map(({ value, label }) => {
        const count = quizzes.filter((q) =>
          matchesQuizListFilter(q.status, value),
        ).length;
        const active = value === current;
        return (
          <Link
            key={value}
            href={value === "a-faire" ? "/quiz" : `/quiz?filtre=${value}`}
            aria-current={active ? "page" : undefined}
            scroll={false}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-background font-medium text-foreground shadow-sm",
            )}
          >
            {label}
            <span
              className={cn(
                "min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums",
                // « À faire » est mis en avant tant qu'il reste des quiz.
                value === "a-faire" && count > 0
                  ? "bg-chart-1 font-semibold text-white"
                  : "bg-foreground/10",
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

const STATUS: Record<
  QuizListStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  todo: {
    label: "À faire",
    icon: CircleDashed,
    className: "text-muted-foreground",
  },
  retry: { label: "À retenter", icon: RotateCcw, className: "text-chart-1" },
  failed: {
    label: "Plus de tentative",
    icon: CircleX,
    className: "text-destructive",
  },
  passed: {
    label: "Réussi",
    icon: Trophy,
    className: "text-emerald-700 dark:text-emerald-400",
  },
};

function QuizRow({ quiz }: { quiz: StudentQuiz }) {
  const status = STATUS[quiz.status];
  const Icon = status.icon;
  const pending = quiz.status === "todo" || quiz.status === "retry";

  return (
    <li
      className={cn(
        "flex flex-col gap-4 border p-4 sm:flex-row sm:items-center sm:gap-6",
        quiz.status === "passed" && "border-emerald-600/25 bg-emerald-600/5",
        quiz.status === "retry" && "border-chart-1/30 bg-chart-1/5",
        quiz.status === "todo" && "bg-card",
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase",
            status.className,
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {status.label}
        </p>
        <h2 className="mt-1 font-semibold">
          <Link href={`/quiz/${quiz.id}`} className="hover:underline">
            {quiz.title}
          </Link>
        </h2>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {quiz.coursTitle} · {quiz.thematiqueTitle}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">{details(quiz)}</p>
      </div>
      <Button
        variant={pending ? "default" : "outline"}
        className="w-fit shrink-0"
        render={
          <Link
            href={pending ? `/quiz/${quiz.id}` : `/quiz/${quiz.id}/historique`}
          />
        }
        nativeButton={false}
      >
        {quiz.status === "todo"
          ? "Commencer"
          : quiz.status === "retry"
            ? "Réessayer"
            : "Voir mes tentatives"}
      </Button>
    </li>
  );
}

function details(quiz: StudentQuiz) {
  const best =
    quiz.best && `Meilleur score ${quiz.best.score}/${quiz.best.total}`;
  const left =
    quiz.left === null
      ? null
      : `${quiz.left} tentative${quiz.left > 1 ? "s" : ""} restante${quiz.left > 1 ? "s" : ""}`;

  switch (quiz.status) {
    case "todo":
      return [
        `${quiz.passingScore} % pour le réussir`,
        quiz.left !== null &&
          `${quiz.left} tentative${quiz.left > 1 ? "s" : ""} possible${quiz.left > 1 ? "s" : ""}`,
      ]
        .filter(Boolean)
        .join(" · ");
    case "retry":
      return [best, `${quiz.passingScore} % pour le réussir`, left]
        .filter(Boolean)
        .join(" · ");
    case "failed":
      return `${best} · Demande une tentative supplémentaire à ton enseignant.`;
    case "passed":
      return best;
  }
}
