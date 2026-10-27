import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { RoadmapStep } from "@/lib/db/queries/roadmap";

// Sous le titre d'un cours de la feuille de route : où l'étudiant en est
// d'un coup d'œil, et un petit moment de satisfaction quand il a tout fini.
export function CourseProgress({ steps }: { steps: RoadmapStep[] }) {
  const lessonsTotal = steps.reduce((n, s) => n + s.ressourceProgress.total, 0);
  const lessonsDone = steps.reduce(
    (n, s) => n + s.ressourceProgress.completed,
    0,
  );
  const stepsDone = steps.filter((s) => s.state === "completed").length;
  if (steps.length === 0 || lessonsTotal === 0) return null;

  const percent = Math.round((lessonsDone / lessonsTotal) * 100);
  const finished = stepsDone === steps.length;

  return (
    <div className="mb-4 -mt-2">
      <div
        className="h-1.5 w-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Progression du cours"
      >
        <div
          className="h-full bg-emerald-600 transition-[width] duration-300 dark:bg-emerald-400"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {lessonsDone}/{lessonsTotal} leçons · {stepsDone}/{steps.length}{" "}
          {steps.length > 1 ? "étapes terminées" : "étape terminée"}
        </span>
        {finished ? (
          <Badge
            variant="outline"
            className="border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
          >
            <Check />
            Cours terminé
          </Badge>
        ) : (
          <span className="tabular-nums">{percent}%</span>
        )}
      </div>
    </div>
  );
}
