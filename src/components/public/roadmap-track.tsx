import Link from "next/link";
import { Check, Hourglass } from "lucide-react";

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
            <StepMarker state={step.state} index={index + 1} />
            <StepCard step={step} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepMarker({
  state,
  index,
}: {
  state: RoadmapStep["state"];
  index: number;
}) {
  return (
    <div
      className={cn(
        "relative z-10 flex size-10 shrink-0 items-center justify-center border text-sm font-semibold tabular-nums",
        state === "completed" &&
          "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950",
        state === "active" && "bg-background border-foreground text-foreground",
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

  return (
    <Link
      href={`/thematiques/${thematique.slug}`}
      className="flex-1 border p-4 transition-colors hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium">{thematique.title}</div>
          {thematique.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {thematique.description}
            </p>
          )}
        </div>
        {state === "completed" && (
          <Badge
            variant="outline"
            className="shrink-0 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
          >
            Terminé
          </Badge>
        )}
      </div>

      {ressourceProgress && (
        <div className="mt-3">
          <div className="h-1.5 w-full bg-muted">
            <div
              className="h-full bg-emerald-600 dark:bg-emerald-400"
              style={{
                width: `${(ressourceProgress.completed / ressourceProgress.total) * 100}%`,
              }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs tabular-nums text-muted-foreground">
            <span>
              {ressourceProgress.completed}/{ressourceProgress.total} leçons
            </span>
            <span>
              {Math.round(
                (ressourceProgress.completed / ressourceProgress.total) * 100
              )}
              %
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}
