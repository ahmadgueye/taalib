// Forme des questions dans l'éditeur de quiz du dashboard. `id` est celui de
// la base (absent pour un élément pas encore enregistré) : il permet de
// mettre à jour les questions en place sans perdre les réponses des élèves.
// `key` est une clé locale stable, pour React et pour l'aperçu.
export type QuestionType = "qcm" | "vrai_faux";

export type ChoixDraft = {
  id?: string;
  key: string;
  label: string;
  isCorrect: boolean;
};

export type QuestionDraft = {
  id?: string;
  key: string;
  prompt: string;
  type: QuestionType;
  explanation: string;
  choix: ChoixDraft[];
};

export function toQuestionDrafts(
  questions: {
    id: string;
    prompt: string;
    type: QuestionType;
    explanation: string | null;
    choix: { id: string; label: string; isCorrect: boolean }[];
  }[]
): QuestionDraft[] {
  return questions.map((q) => ({
    id: q.id,
    key: q.id,
    prompt: q.prompt,
    type: q.type,
    explanation: q.explanation ?? "",
    choix: q.choix.map((c) => ({
      id: c.id,
      key: c.id,
      label: c.label,
      isCorrect: c.isCorrect,
    })),
  }));
}
