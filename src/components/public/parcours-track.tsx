import Link from "next/link";
import { Check, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/public/progress-ring";
import type { ParcoursStep } from "@/lib/db/queries/parcours";
import { cn } from "@/lib/utils";

export function ParcoursTrack({ steps }: { steps: ParcoursStep[] }) {
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
          <li key={step.etapeId} className="relative flex gap-4">
            <StepMarker state={step.state} index={index + 1} />
            <StepCard
              step={step}
              previousTitle={index > 0 ? steps[index - 1].cours.title : null}
            />
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
  state: ParcoursStep["state"];
  index: number;
}) {
  return (
    <div
      className={cn(
        "relative z-10 flex size-10 shrink-0 items-center justify-center border text-sm font-semibold tabular-nums",
        state === "completed" &&
          "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950",
        state === "active" && "bg-background border-foreground text-foreground",
        state === "locked" &&
          "bg-background border-border text-muted-foreground",
      )}
    >
      {state === "completed" ? (
        <Check className="size-4" />
      ) : state === "locked" ? (
        <Lock className="size-4" />
      ) : (
        index
      )}
    </div>
  );
}

function StepCard({
  step,
  previousTitle,
}: {
  step: ParcoursStep;
  previousTitle: string | null;
}) {
  const { cours, state } = step;

  if (state === "locked") {
    return (
      <div className="flex-1 border border-dashed bg-muted p-4">
        <div className="font-medium text-muted-foreground">{cours.title}</div>
        {cours.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {cours.description}
          </p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5 shrink-0" />
          {previousTitle
            ? `Débloqué en réussissant les quiz de « ${previousTitle} »`
            : "Verrouillé"}
        </p>
      </div>
    );
  }

  const showProgressRing =
    state === "active" &&
    step.ressourceProgress &&
    step.ressourceProgress.total > 0;

  return (
    <Link
      href={`/cours/${cours.slug}`}
      className="flex-1 border p-4 transition-colors hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium">{cours.title}</div>
          {cours.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {cours.description}
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
        {showProgressRing && (
          <ProgressRing
            value={
              (step.ressourceProgress!.completed /
                step.ressourceProgress!.total) *
              100
            }
            size={34}
            strokeWidth={3.5}
          />
        )}
        {state === "active" && !step.ressourceProgress && (
          <Badge variant="secondary" className="shrink-0">
            Aperçu
          </Badge>
        )}
      </div>
    </Link>
  );
}
