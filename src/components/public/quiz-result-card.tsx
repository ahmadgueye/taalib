"use client";

import { useEffect, useState } from "react";
import { CircleCheck, RotateCcw, Trophy } from "lucide-react";

import { ProgressRing } from "@/components/public/progress-ring";
import { cn } from "@/lib/utils";

// Résultat d'une tentative, affiché à la place des questions : c'est la
// première chose que l'étudiant voit après « Valider ».
export function QuizResultCard({
  score,
  total,
  passingScore,
  attemptPassed,
  quizPassed,
  attemptsLeft,
}: {
  score: number;
  total: number;
  // null : aperçu du dashboard, sans verdict.
  passingScore: number | null;
  attemptPassed: boolean;
  // Réussi par cette tentative ou une précédente.
  quizPassed: boolean;
  attemptsLeft: number | null;
}) {
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  // L'anneau se remplit depuis 0 à l'apparition de la carte.
  const [ringValue, setRingValue] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRingValue(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);

  const tone =
    passingScore === null ? "neutral" : quizPassed ? "success" : "retry";

  const verdict =
    tone === "neutral"
      ? null
      : attemptPassed
        ? { icon: Trophy, label: "Quiz réussi" }
        : quizPassed
          ? { icon: CircleCheck, label: "Quiz déjà validé" }
          : { icon: RotateCcw, label: "Pas encore validé" };

  return (
    <section
      aria-label="Résultat de cette tentative"
      className={cn(
        "border p-6 animate-in fade-in zoom-in-95 duration-500 motion-reduce:animate-none sm:p-8",
        tone === "success" && "border-emerald-600/30 bg-emerald-600/10",
        tone === "retry" && "border-chart-1/40 bg-chart-1/10",
        tone === "neutral" && "bg-card",
      )}
    >
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:gap-8 sm:text-left">
        <div className="relative shrink-0">
          <ProgressRing
            value={ringValue}
            size={128}
            strokeWidth={10}
            label={`Score : ${percent} %`}
            indicatorClassName={cn(
              "duration-1000 ease-out motion-reduce:transition-none",
              tone !== "success" && "stroke-chart-1 dark:stroke-chart-1",
            )}
          />
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center font-heading text-3xl font-semibold tabular-nums"
          >
            {percent}%
          </span>
        </div>

        <div className="min-w-0">
          {verdict && (
            <p
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase",
                tone === "success"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-chart-1",
              )}
            >
              <verdict.icon className="size-4" aria-hidden />
              {verdict.label}
            </p>
          )}
          <p className="mt-1 font-heading text-5xl font-semibold tabular-nums">
            {score}
            <span className="text-3xl text-muted-foreground">/{total}</span>
          </p>
          <p className="mt-2 text-base font-medium">
            {message(score, total, attemptPassed)}
          </p>
          {tone === "retry" && (
            <p className="mt-1 text-sm text-muted-foreground">
              Il faut {passingScore} % de bonnes réponses pour valider ce quiz.
              {attemptsLeft !== null && (
                <>
                  {" "}
                  <span className="font-medium text-destructive">
                    {attemptsLeft === 0
                      ? "Tu as utilisé toutes tes tentatives."
                      : `Il te reste ${attemptsLeft} tentative${attemptsLeft > 1 ? "s" : ""}.`}
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function message(score: number, total: number, attemptPassed: boolean) {
  if (attemptPassed) {
    return score === total
      ? "Sans faute, bravo !"
      : "Bravo, tu as validé ce quiz !";
  }
  const ratio = total > 0 ? score / total : 0;
  if (ratio >= 0.8) return "Excellent travail, continue comme ça !";
  if (ratio >= 0.5) return "Bien joué ! Regarde tes erreurs pour progresser.";
  return "Courage ! Relis les leçons, puis réessaie.";
}
