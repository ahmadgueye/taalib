import type { QuizCorrection } from "@/lib/db/queries/quiz-tentatives";

type GradedQuestion = {
  id: string;
  prompt: string;
  explanation: string | null;
  choix: { id: string; label: string; isCorrect: boolean }[];
};

// Une question est juste quand les choix cochés sont exactement les bonnes
// réponses : ni oubli ni choix en trop. Partagé entre la correction serveur
// (lib/actions/quiz-tentatives.ts) et l'aperçu du dashboard.
export function gradeQuestions(
  questions: GradedQuestion[],
  answers: Map<string, Set<string>>
): { score: number; corrections: QuizCorrection[] } {
  let score = 0;
  const corrections: QuizCorrection[] = [];

  for (const question of questions) {
    const selected = answers.get(question.id) ?? new Set<string>();
    const correctIds = new Set(
      question.choix.filter((c) => c.isCorrect).map((c) => c.id)
    );
    const isCorrect =
      selected.size === correctIds.size &&
      [...selected].every((id) => correctIds.has(id));
    if (isCorrect) score += 1;

    corrections.push({
      questionId: question.id,
      prompt: question.prompt,
      explanation: question.explanation,
      selectedChoixIds: [...selected],
      choix: question.choix.map((c) => ({
        id: c.id,
        label: c.label,
        isCorrect: c.isCorrect,
      })),
    });
  }

  return { score, corrections };
}
