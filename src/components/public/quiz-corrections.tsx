import { CheckCircle2, XCircle } from "lucide-react";

import type { QuizCorrection } from "@/lib/db/queries/quiz-tentatives";
import { cn } from "@/lib/utils";

export function QuizCorrections({
  corrections,
}: {
  corrections: QuizCorrection[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {corrections.map((correction, index) => {
        const correctIds = new Set(
          correction.choix.filter((c) => c.isCorrect).map((c) => c.id)
        );
        const isCorrect =
          correction.selectedChoixIds.length === correctIds.size &&
          correction.selectedChoixIds.every((id) => correctIds.has(id));
        return (
          <div key={correction.questionId} className="border p-4">
            <div className="flex items-start gap-2">
              {isCorrect ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <p className="font-medium">
                {index + 1}. {correction.prompt}
              </p>
            </div>
            <ul className="mt-2 ml-6 flex flex-col gap-1 text-sm">
              {correction.choix.map((choix) => {
                const wasSelected = correction.selectedChoixIds.includes(
                  choix.id
                );
                return (
                  <li
                    key={choix.id}
                    className={cn(
                      "text-muted-foreground",
                      choix.isCorrect && "font-medium text-emerald-600",
                      wasSelected && !choix.isCorrect && "text-destructive"
                    )}
                  >
                    {wasSelected ? "→ " : ""}
                    {choix.label}
                  </li>
                );
              })}
            </ul>
            {correction.explanation && (
              <p className="mt-2 text-sm text-muted-foreground">
                {correction.explanation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
