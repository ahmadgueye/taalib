import { describe, expect, it } from "vitest";

import { gradeQuestions } from "@/lib/quiz-grading";

const questions = [
  {
    id: "q1",
    prompt: "Un seul bon choix",
    explanation: null,
    choix: [
      { id: "a", label: "A", isCorrect: true },
      { id: "b", label: "B", isCorrect: false },
    ],
  },
  {
    id: "q2",
    prompt: "Deux bons choix",
    explanation: "Les deux.",
    choix: [
      { id: "c", label: "C", isCorrect: true },
      { id: "d", label: "D", isCorrect: true },
      { id: "e", label: "E", isCorrect: false },
    ],
  },
];

describe("gradeQuestions", () => {
  it("counts a question right only with exactly the correct choices", () => {
    const { score } = gradeQuestions(
      questions,
      new Map([
        ["q1", new Set(["a"])],
        ["q2", new Set(["c"])],
      ])
    );
    expect(score).toBe(1);
  });

  it("rejects an extra wrong choice", () => {
    const { score } = gradeQuestions(
      questions,
      new Map([
        ["q1", new Set(["a", "b"])],
        ["q2", new Set(["c", "d"])],
      ])
    );
    expect(score).toBe(1);
  });

  it("returns a correction per question, unanswered ones included", () => {
    const { score, corrections } = gradeQuestions(questions, new Map());
    expect(score).toBe(0);
    expect(corrections.map((c) => c.selectedChoixIds)).toEqual([[], []]);
    expect(corrections[1].explanation).toBe("Les deux.");
  });
});
