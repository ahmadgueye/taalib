import Link from "next/link";
import { HelpCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function QuizItem({
  id,
  title,
  description,
  questionCount,
  score,
}: {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  score?: { lastScore: number; lastTotal: number; attemptsCount: number };
}) {
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
              "bg-emerald-600 text-white dark:bg-emerald-500"
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
