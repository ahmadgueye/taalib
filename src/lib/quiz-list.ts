import { attemptsLeft, isPassing } from "@/lib/quiz-attempts";

// Page /quiz : où en est l'étudiant avec chacun de ses quiz.
//   todo    : jamais tenté
//   retry   : raté, des tentatives restent (ou quiz illimité)
//   failed  : raté, plus aucune tentative
//   passed  : réussi (meilleur score ≥ seuil)
export type QuizListStatus = "todo" | "retry" | "failed" | "passed";

export type QuizListFilter = "a-faire" | "reussis" | "echoues";

export const QUIZ_LIST_FILTERS: { value: QuizListFilter; label: string }[] = [
  { value: "a-faire", label: "À faire" },
  { value: "reussis", label: "Réussis" },
  { value: "echoues", label: "Échoués" },
];

export function parseQuizListFilter(value: string | undefined): QuizListFilter {
  return QUIZ_LIST_FILTERS.some((f) => f.value === value)
    ? (value as QuizListFilter)
    : "a-faire";
}

export function quizListStatus({
  passingScore,
  maxAttempts,
  extra,
  score,
}: {
  passingScore: number;
  maxAttempts: number | null;
  extra: number;
  // Meilleur score et nombre de tentatives, absent si jamais tenté.
  score?: { bestScore: number; bestTotal: number; attemptsCount: number };
}): { status: QuizListStatus; left: number | null } {
  const left = attemptsLeft(maxAttempts, extra, score?.attemptsCount ?? 0);
  if (!score) return { status: "todo", left };
  if (isPassing(score.bestScore, score.bestTotal, passingScore)) {
    return { status: "passed", left };
  }
  return { status: left === 0 ? "failed" : "retry", left };
}

// « À faire » : tout ce que l'étudiant peut encore valider, les quiz jamais
// tentés d'abord. « Échoués » : tout quiz raté, qu'il reste des tentatives
// ou non.
export function matchesQuizListFilter(
  status: QuizListStatus,
  filter: QuizListFilter,
) {
  switch (filter) {
    case "a-faire":
      return status === "todo" || status === "retry";
    case "reussis":
      return status === "passed";
    case "echoues":
      return status === "retry" || status === "failed";
  }
}

export function filterQuizList<T extends { status: QuizListStatus }>(
  items: T[],
  filter: QuizListFilter,
): T[] {
  const matching = items.filter((i) => matchesQuizListFilter(i.status, filter));
  if (filter !== "a-faire") return matching;
  // Tri stable : l'ordre du programme est gardé dans chaque groupe.
  return [
    ...matching.filter((i) => i.status === "todo"),
    ...matching.filter((i) => i.status !== "todo"),
  ];
}

// Pastille du menu : les quiz encore à valider (onglet « À faire »).
export function countPendingQuizzes(items: { status: QuizListStatus }[]) {
  return items.filter((i) => matchesQuizListFilter(i.status, "a-faire")).length;
}
