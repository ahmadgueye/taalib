import Link from "next/link";
import { Check, Hourglass } from "lucide-react";

import { ProgressIndicator } from "@/components/public/progress-indicator";
import { ProgressRing } from "@/components/public/progress-ring";
import { Badge } from "@/components/ui/badge";
import type { RoadmapStep } from "@/lib/db/queries/roadmap";
import { cn } from "@/lib/utils";

export function RoadmapTrack({ steps }: { steps: RoadmapStep[] }) {
  return (
    <div className="relative">
      {steps.length > 1 && (
        <div
          className="absolute top-5 bottom-5 left-5 -translate-x-1/2 w-px bg-border"
          aria-hidden
        />
      )}
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step.thematique.id} className="relative flex gap-4">
            <StepMarker
              state={step.state}
              index={index + 1}
              isNew={step.newCount > 0 && step.state === "active"}
            />
            <StepCard step={step} />
          </li>
        ))}
      </ol>
    </div>
  );
}

// Du nouveau dans l'étape : le carré prend la couleur principale et un halo
// pulse trois fois à l'arrivée (pas en boucle, et pas du tout si l'étudiant
// a demandé moins d'animations).
function StepMarker({
  state,
  index,
  isNew,
}: {
  state: RoadmapStep["state"];
  index: number;
  isNew: boolean;
}) {
  return (
    <div className="relative z-10 size-10 shrink-0" title={isNew ? "Nouveau" : undefined}>
      {isNew && (
        <span
          className="absolute inset-0 bg-primary/40 motion-safe:animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_3]"
          aria-hidden
        />
      )}
      <div
        className={cn(
          "relative flex size-10 items-center justify-center border text-sm font-semibold tabular-nums",
          state === "completed" &&
            "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950",
          state === "active" &&
            (isNew
              ? "bg-background border-primary text-primary"
              : "bg-background border-foreground text-foreground"),
          state === "upcoming" &&
            "bg-background border-border text-locked-foreground",
        )}
      >
        {state === "completed" ? (
          <Check className="size-4" />
        ) : state === "upcoming" ? (
          <Hourglass className="size-4" />
        ) : (
          index
        )}
        {isNew && <span className="sr-only">Nouveau</span>}
      </div>
    </div>
  );
}

function StepCard({ step }: { step: RoadmapStep }) {
  const { thematique, state } = step;

  if (state === "upcoming") {
    return (
      <div className="flex-1 border border-dashed bg-muted p-4">
        <div className="font-medium text-locked-foreground">
          {thematique.title}
        </div>
        {thematique.description && (
          <p className="mt-1 text-sm text-locked-foreground">
            {thematique.description}
          </p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-locked-foreground">
          <Hourglass className="size-3.5 shrink-0" />
          À venir : ton enseignant ouvrira cette étape au fil des cours
        </p>
      </div>
    );
  }

  const ressourceProgress =
    state === "active" && step.ressourceProgress.total > 0
      ? step.ressourceProgress
      : null;

  const percent = ressourceProgress
    ? Math.round(
        (ressourceProgress.completed / ressourceProgress.total) * 100,
      )
    : null;

  return (
    <Link
      href={`/thematiques/${thematique.slug}`}
      className="flex-1 border p-4 transition-colors hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {/* Mobile : anneau compact et libellé, avant le titre. */}
          {ressourceProgress && (
            <ProgressIndicator
              value={percent ?? 0}
              className="mb-2 text-xs sm:hidden"
            />
          )}
          <div className="font-medium">{thematique.title}</div>
          {thematique.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {thematique.description}
            </p>
          )}
          {ressourceProgress && (
            <p className="mt-2 hidden text-xs tabular-nums text-muted-foreground sm:block">
              {ressourceProgress.completed}/{ressourceProgress.total} leçons
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
          {state === "completed" && (
            <Badge
              variant="outline"
              className="border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
            >
              Terminé
            </Badge>
          )}
          {percent !== null && (
            <div className="relative hidden size-11 items-center justify-center sm:flex">
              <ProgressRing value={percent} size={44} strokeWidth={4} />
              <span className="absolute text-[11px] font-medium tabular-nums">
                {percent}%
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
