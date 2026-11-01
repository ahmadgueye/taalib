"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { QuizCorrections } from "@/components/public/quiz-corrections";
import {
  submitQuizAttempt,
  type SubmitQuizResult,
} from "@/lib/actions/quiz-tentatives";
import { cn } from "@/lib/utils";

type Choix = { id: string; label: string };
type Question = {
  id: string;
  prompt: string;
  type: "qcm" | "vrai_faux";
  choix: Choix[];
};

type QuizResult = Extract<SubmitQuizResult, { score: number }>;

function encouragement(score: number, total: number) {
  const ratio = total > 0 ? score / total : 0;
  if (ratio >= 0.8) return "Excellent travail, continue comme ça !";
  if (ratio >= 0.5) return "Bien joué ! Regarde tes erreurs pour progresser.";
  return "Courage ! Relis les leçons, puis réessaie.";
}

export function QuizAttempt({
  quizId,
  questions,
  previewGrade,
}: {
  quizId: string;
  questions: Question[];
  // Aperçu du dashboard : corrige sur place, sans rien enregistrer.
  previewGrade?: (
    answers: Map<string, Set<string>>
  ) => Pick<QuizResult, "score" | "corrections">;
}) {
  const [answers, setAnswers] = useState<Record<string, Set<string>>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const answeredCount = questions.filter(
    (q) => (answers[q.id]?.size ?? 0) > 0
  ).length;

  function clearMissing(questionId: string) {
    setMissing((prev) => {
      if (!prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  }

  function toggleChoix(questionId: string, choixId: string) {
    clearMissing(questionId);
    setAnswers((prev) => {
      const next = new Set(prev[questionId] ?? []);
      if (next.has(choixId)) next.delete(choixId);
      else next.add(choixId);
      return { ...prev, [questionId]: next };
    });
  }

  // Vrai/faux : une seule réponse possible.
  function selectChoix(questionId: string, choixId: string) {
    clearMissing(questionId);
    setAnswers((prev) => ({ ...prev, [questionId]: new Set([choixId]) }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const unanswered = questions.filter((q) => !answers[q.id]?.size);
    if (unanswered.length > 0) {
      setMissing(new Set(unanswered.map((q) => q.id)));
      setError(
        unanswered.length === 1
          ? "Il reste 1 question sans réponse."
          : `Il reste ${unanswered.length} questions sans réponse.`
      );
      questionRefs.current[unanswered[0].id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    if (previewGrade) {
      const graded = previewGrade(new Map(Object.entries(answers)));
      setResult({ ...graded, tentativeId: "", total: questions.length });
      return;
    }

    startTransition(async () => {
      const payload = questions.map((q) => ({
        questionId: q.id,
        choixIds: [...(answers[q.id] ?? [])],
      }));
      const res = await submitQuizAttempt(quizId, payload);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setResult(res);
    });
  }

  function restart() {
    setAnswers({});
    setResult(null);
    setError(null);
    setMissing(new Set());
  }

  if (result) {
    return (
      <div className="mt-8">
        <div className="rounded-lg border p-4">
          <p className="font-heading text-2xl font-semibold">
            {result.score}/{result.total}
          </p>
          <p className="text-sm text-muted-foreground">
            Résultat de cette tentative
          </p>
          <p className="mt-2 text-sm font-medium">
            {encouragement(result.score, result.total)}
          </p>
        </div>

        <div className="mt-6">
          <QuizCorrections corrections={result.corrections} />
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={restart}>
            Recommencer
          </Button>
          {!previewGrade && (
            <Button
              variant="ghost"
              render={<Link href={`/quiz/${quizId}/historique`} />}
            >
              Voir l&apos;historique
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
      <div
        className="flex items-center gap-3 py-2 text-sm text-muted-foreground"
        aria-live="polite"
      >
        <span className="shrink-0 tabular-nums">
          {answeredCount}/{questions.length} répondues
        </span>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={answeredCount}
          aria-label="Questions répondues"
        >
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{
              width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {questions.map((question, index) => {
        const isMissing = missing.has(question.id);
        const selected = answers[question.id];
        const isTrueFalse = question.type === "vrai_faux";
        return (
          <div
            key={question.id}
            ref={(el) => {
              questionRefs.current[question.id] = el;
            }}
            role={isTrueFalse ? "radiogroup" : "group"}
            aria-labelledby={`q-${question.id}`}
            className={cn(
              "scroll-mt-24 border p-4 transition-colors",
              isMissing && "border-destructive"
            )}
          >
            <p id={`q-${question.id}`} className="font-medium">
              {index + 1}. {question.prompt}
            </p>
            {!isTrueFalse && (
              <p className="mt-1 text-xs text-muted-foreground">
                Plusieurs réponses possibles.
              </p>
            )}
            {isMissing && (
              <p className="mt-1 text-xs text-destructive">
                Choisis une réponse.
              </p>
            )}
            <div
              className={cn(
                "mt-3 gap-2",
                isTrueFalse ? "grid grid-cols-2" : "flex flex-col"
              )}
            >
              {question.choix.map((choix) => {
                const checked = selected?.has(choix.id) ?? false;
                return (
                  <label
                    key={choix.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                      isTrueFalse && "justify-center font-medium",
                      checked && "border-primary bg-primary/5"
                    )}
                  >
                    {isTrueFalse ? (
                      <input
                        type="radio"
                        name={question.id}
                        checked={checked}
                        onChange={() => selectChoix(question.id, choix.id)}
                        className="sr-only"
                      />
                    ) : (
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          toggleChoix(question.id, choix.id)
                        }
                      />
                    )}
                    {choix.label}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" loading={isPending} className="w-fit">
        {isPending ? "Correction…" : "Valider"}
      </Button>
    </form>
  );
}
