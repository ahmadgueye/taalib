import { beforeEach, describe, expect, it, vi } from "vitest";

const QUIZ = "11111111-1111-4111-8111-111111111111";
const Q1 = "22222222-2222-4222-8222-222222222221";
const Q2 = "22222222-2222-4222-8222-222222222222";
const A = "33333333-3333-4333-8333-333333333331"; // Q1 correct
const B = "33333333-3333-4333-8333-333333333332"; // Q1 wrong
const C = "33333333-3333-4333-8333-333333333333"; // Q2 correct
const D = "33333333-3333-4333-8333-333333333334"; // Q2 correct
const E = "33333333-3333-4333-8333-333333333335"; // Q2 wrong
const FOREIGN = "44444444-4444-4444-8444-444444444444";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  findMany: vi.fn(),
  findQuiz: vi.fn(),
  tentativeValues: vi.fn(),
  reponsesValues: vi.fn(),
  getContentAccess: vi.fn(),
}));

vi.mock("@/lib/auth/content-access", () => ({
  getContentAccess: mocks.getContentAccess,
}));

vi.mock("@/lib/auth/get-session", () => ({
  getCurrentProfile: mocks.getCurrentProfile,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      quizQuestions: { findMany: mocks.findMany },
      quiz: { findFirst: mocks.findQuiz },
    },
    transaction: async (fn: (tx: unknown) => Promise<string>) =>
      fn({
        insert: () => ({
          values: (v: unknown) => {
            const isTentative = !Array.isArray(v);
            (isTentative ? mocks.tentativeValues : mocks.reponsesValues)(v);
            return isTentative
              ? { returning: async () => [{ id: "tentative-1" }] }
              : Promise.resolve();
          },
        }),
      }),
  },
}));

import { submitQuizAttempt } from "@/lib/actions/quiz-tentatives";

function choix(id: string, isCorrect: boolean, orderIndex: number) {
  return { id, label: id, isCorrect, orderIndex };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentProfile.mockResolvedValue({ id: "user-1", role: "viewer" });
  mocks.findQuiz.mockResolvedValue({ id: QUIZ });
  mocks.getContentAccess.mockResolvedValue({ all: true });
  mocks.findMany.mockResolvedValue([
    {
      id: Q1,
      prompt: "Q1",
      explanation: null,
      orderIndex: 0,
      choix: [choix(A, true, 0), choix(B, false, 1)],
    },
    {
      id: Q2,
      prompt: "Q2 (multi)",
      explanation: "parce que",
      orderIndex: 1,
      choix: [choix(C, true, 0), choix(D, true, 1), choix(E, false, 2)],
    },
  ]);
});

describe("submitQuizAttempt", () => {
  it("rejects anonymous visitors without touching the database", async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);
    const res = await submitQuizAttempt(QUIZ, []);
    expect(res).toEqual({ error: "Connecte-toi pour passer ce quiz." });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects a malformed payload", async () => {
    const res = await submitQuizAttempt("not-a-uuid", []);
    expect(res).toEqual({ error: "Réponses invalides." });
  });

  it("refuses a quiz that is a draft or doesn't exist, without leaking its answers", async () => {
    mocks.findQuiz.mockResolvedValue(undefined);
    const res = await submitQuizAttempt(QUIZ, [{ questionId: Q1, choixIds: [A] }]);
    expect(res).toEqual({ error: "Quiz introuvable." });
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.tentativeValues).not.toHaveBeenCalled();
  });

  it("rejects a quiz with no questions", async () => {
    mocks.findMany.mockResolvedValue([]);
    const res = await submitQuizAttempt(QUIZ, []);
    expect(res).toEqual({ error: "Ce quiz n'a aucune question." });
  });

  it("scores a perfect attempt, including a multi-answer question", async () => {
    const res = await submitQuizAttempt(QUIZ, [
      { questionId: Q1, choixIds: [A] },
      { questionId: Q2, choixIds: [C, D] },
    ]);
    expect(res).toMatchObject({ score: 2, total: 2, tentativeId: "tentative-1" });
  });

  it("gives no point for a partially correct multi-answer question", async () => {
    const res = await submitQuizAttempt(QUIZ, [
      { questionId: Q1, choixIds: [A] },
      { questionId: Q2, choixIds: [C] },
    ]);
    expect(res).toMatchObject({ score: 1, total: 2 });
  });

  it("gives no point when a wrong choice is ticked alongside the right ones", async () => {
    const res = await submitQuizAttempt(QUIZ, [
      { questionId: Q1, choixIds: [A] },
      { questionId: Q2, choixIds: [C, D, E] },
    ]);
    expect(res).toMatchObject({ score: 1, total: 2 });
  });

  it("counts an unanswered question as wrong and the quiz total stays the full question count", async () => {
    const res = await submitQuizAttempt(QUIZ, [{ questionId: Q1, choixIds: [A] }]);
    expect(res).toMatchObject({ score: 1, total: 2 });
  });

  it("scores from database truth: a forged isCorrect in the payload is ignored", async () => {
    const res = await submitQuizAttempt(QUIZ, [
      {
        questionId: Q1,
        choixIds: [B],
        // extra client-side field must not be trusted
        isCorrect: true,
      } as never,
    ]);
    expect(res).toMatchObject({ score: 0 });
  });

  it("ignores choice ids that don't belong to the quiz and never stores them", async () => {
    const res = await submitQuizAttempt(QUIZ, [
      { questionId: Q1, choixIds: [A, FOREIGN] },
    ]);
    // A + a foreign id is not the exact correct set → wrong, but no crash.
    expect(res).toMatchObject({ score: 0 });
    const stored = mocks.reponsesValues.mock.calls.flatMap(([rows]) => rows);
    expect(stored.map((r: { choixId: string }) => r.choixId)).not.toContain(
      FOREIGN
    );
  });

  it("records the attempt under the authenticated user, not a client-provided id", async () => {
    await submitQuizAttempt(QUIZ, [{ questionId: Q1, choixIds: [A] }]);
    expect(mocks.tentativeValues).toHaveBeenCalledWith({
      quizId: QUIZ,
      userId: "user-1",
      score: 1,
      totalQuestions: 2,
    });
  });

  it("returns corrections that reveal the right answers only after submission", async () => {
    const res = await submitQuizAttempt(QUIZ, [{ questionId: Q1, choixIds: [B] }]);
    if ("error" in res) throw new Error(res.error);
    const q1 = res.corrections.find((c) => c.questionId === Q1)!;
    expect(q1.selectedChoixIds).toEqual([B]);
    expect(q1.choix.find((c) => c.id === A)?.isCorrect).toBe(true);
  });
});

describe("submitQuizAttempt access", () => {
  it("refuses a quiz not unlocked for the student's classes", async () => {
    mocks.getContentAccess.mockResolvedValue({
      all: false,
      inAnyClass: true,
      coursIds: new Set(),
      thematiqueIds: new Set(),
      ressourceIds: new Set(),
      quizIds: new Set(),
    });
    expect(await submitQuizAttempt(QUIZ, [])).toEqual({
      error: "Quiz introuvable.",
    });
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.tentativeValues).not.toHaveBeenCalled();
  });
});
