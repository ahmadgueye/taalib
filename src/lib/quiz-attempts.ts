// Limite de tentatives d'un quiz, partagée par la soumission, la page du quiz
// et l'historique.

export type AttemptRules = {
  maxAttempts: number | null;
  hideCorrections: boolean;
};

// Tentatives restantes, ou null si le quiz est illimité.
export function attemptsLeft(
  maxAttempts: number | null,
  extra: number,
  used: number
) {
  if (maxAttempts === null) return null;
  return Math.max(0, maxAttempts + extra - used);
}

// La correction détaillée révèle les bonnes réponses : avec l'option, elle
// attend que l'étudiant ait réussi ou n'ait plus de tentative.
export function canSeeCorrections(
  rules: AttemptRules,
  { left, passed }: { left: number | null; passed: boolean }
) {
  if (!rules.hideCorrections || left === null) return true;
  return passed || left === 0;
}

export function isPassing(score: number, total: number, passingScore: number) {
  return total > 0 && (score / total) * 100 >= passingScore;
}
