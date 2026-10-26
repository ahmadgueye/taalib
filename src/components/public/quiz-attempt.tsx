"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { QuizCorrections } from "@/components/public/quiz-corrections";
import {
  submitQuizAttempt,
  type SubmitQuizResult,
} from "@/lib/actions/quiz-tentatives";

type Choix = { id: string; label: string };
type Question = {
  id: string;
  prompt: string;
  type: "qcm" | "vrai_faux";
  choix: Choix[];
};

type QuizResult = Extract<SubmitQuizResult, { score: number }>;

export function QuizAttempt({
  quizId,
  questions,
}: {
  quizId: string;
  questions: Question[];
}) {
  const [answers, setAnswers] = useState<Record<string, Set<string>>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleChoix(questionId: string, choixId: string) {
    setAnswers((prev) => {
      const next = new Set(prev[questionId] ?? []);
      if (next.has(choixId)) next.delete(choixId);
      else next.add(choixId);
      return { ...prev, [questionId]: next };
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
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
        </div>

        <div className="mt-6">
          <QuizCorrections corrections={result.corrections} />
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={restart}>
            Recommencer
          </Button>
          <Button
            variant="ghost"
            render={<Link href={`/quiz/${quizId}/historique`} />}
          >
            Voir l&apos;historique
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      {questions.map((question, index) => (
        <div key={question.id} className="border p-4">
          <p className="font-medium">
            {index + 1}. {question.prompt}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {question.choix.map((choix) => (
              <label
                key={choix.id}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={answers[question.id]?.has(choix.id) ?? false}
                  onCheckedChange={() => toggleChoix(question.id, choix.id)}
                />
                {choix.label}
              </label>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Correction…" : "Valider"}
      </Button>
    </form>
  );
}
