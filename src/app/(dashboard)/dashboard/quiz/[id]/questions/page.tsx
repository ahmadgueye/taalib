import { notFound } from "next/navigation";

import { QuizBuilder } from "@/components/dashboard/quiz-builder";
import { getQuizWithQuestions } from "@/lib/db/queries/quiz";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function QuizQuestionsPage({ params }: Props) {
  const { id } = await params;
  const quiz = await getQuizWithQuestions(id);

  if (!quiz) notFound();

  const initialQuestions = quiz.questions.map((q) => ({
    prompt: q.prompt,
    type: q.type,
    explanation: q.explanation ?? "",
    choix: q.choix.map((c) => ({ label: c.label, isCorrect: c.isCorrect })),
  }));

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Questions — {quiz.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Modifier ici remplace entièrement les questions de ce quiz.
      </p>
      <div className="mt-6">
        <QuizBuilder quizId={quiz.id} initialQuestions={initialQuestions} />
      </div>
    </div>
  );
}
