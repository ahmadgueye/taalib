import { describe, expect, it } from "vitest";

import { questionsSchema } from "@/lib/actions/quiz-questions.schema";

function makeQuestion(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    prompt: "Quel est le premier pilier de l'islam ?",
    type: "qcm",
    choix: [
      { label: "La Shahada", isCorrect: true },
      { label: "Le jeûne", isCorrect: false },
    ],
    ...overrides,
  };
}

describe("questionsSchema", () => {
  it("accepts a well-formed QCM question", () => {
    const result = questionsSchema.safeParse([makeQuestion()]);
    expect(result.success).toBe(true);
  });

  it("rejects an empty question list", () => {
    const result = questionsSchema.safeParse([]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Ajoutez au moins une question."
      );
    }
  });

  it("rejects a question with a blank prompt", () => {
    const result = questionsSchema.safeParse([makeQuestion({ prompt: "  " })]);
    expect(result.success).toBe(false);
  });

  it("rejects a question with fewer than 2 choices", () => {
    const result = questionsSchema.safeParse([
      makeQuestion({ choix: [{ label: "Seul choix", isCorrect: true }] }),
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Chaque question doit avoir au moins 2 choix."
      );
    }
  });

  it("rejects a question with no correct choice", () => {
    const result = questionsSchema.safeParse([
      makeQuestion({
        choix: [
          { label: "A", isCorrect: false },
          { label: "B", isCorrect: false },
        ],
      }),
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Chaque question doit avoir au moins une bonne réponse."
      );
    }
  });

  it("accepts a vrai_faux question with exactly one correct choice", () => {
    const result = questionsSchema.safeParse([
      makeQuestion({
        type: "vrai_faux",
        choix: [
          { label: "Vrai", isCorrect: true },
          { label: "Faux", isCorrect: false },
        ],
      }),
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects a vrai_faux question with two correct choices", () => {
    const result = questionsSchema.safeParse([
      makeQuestion({
        type: "vrai_faux",
        choix: [
          { label: "Vrai", isCorrect: true },
          { label: "Faux", isCorrect: true },
        ],
      }),
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Une question Vrai/Faux doit avoir exactement une bonne réponse."
      );
    }
  });
});
