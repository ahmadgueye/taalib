import Link from "next/link";
import { HelpCircle, Hourglass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function QuizItem({
  id,
  title,
  description,
  questionCount,
  passingScore,
  score,
  locked = false,
}: {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  passingScore: number;
  score?: {
    lastScore: number;
    lastTotal: number;
    bestScore: number;
    bestTotal: number;
    attemptsCount: number;
  };
  // Pas encore débloqué : titre seulement, sans lien.
  locked?: boolean;
}) {
  if (locked) {
    return (
      <div className="border border-dashed bg-muted p-4">
        <span className="inline-flex items-center gap-1.5 font-medium text-locked-foreground">
          <HelpCircle className="size-3.5" />
          {title}
        </span>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-locked-foreground">
          <Hourglass className="size-3.5 shrink-0" />
          À venir : ton enseignant l&apos;ouvrira au fil des cours
        </p>
      </div>
    );
  }

  const passed = score
    ? (score.bestScore / score.bestTotal) * 100 >= passingScore
    : false;

  return (
    <Link
      href={`/quiz/${id}`}
      className="block border p-4 transition-colors hover:bg-muted"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <HelpCircle className="size-3.5 text-muted-foreground" />
          {title}
        </span>
        <Badge
          variant={score ? "default" : "outline"}
          className={cn(
            score &&
              (passed
                ? "bg-emerald-600 text-white dark:bg-emerald-500"
                : "bg-destructive text-white")
          )}
        >
          {score ? `${score.lastScore}/${score.lastTotal}` : "Non commencé"}
        </Badge>
      </div>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {questionCount} question{questionCount > 1 ? "s" : ""}
        {score && score.attemptsCount > 1
          ? ` · ${score.attemptsCount} tentatives`
          : ""}
      </p>
    </Link>
  );
}
