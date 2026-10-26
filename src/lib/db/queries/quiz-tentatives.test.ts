import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tentativesFindMany: vi.fn(),
  tentativesFindFirst: vi.fn(),
  questionsFindMany: vi.fn(),
  reponsesFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      quizTentatives: {
        findMany: mocks.tentativesFindMany,
        findFirst: mocks.tentativesFindFirst,
      },
      quizQuestions: { findMany: mocks.questionsFindMany },
      quizReponses: { findMany: mocks.reponsesFindMany },
    },
  },
}));

import {
  getQuizAttemptsSummary,
  getQuizQuestionStats,
  getQuizSubmissionStats,
  getTentativeDetail,
  getTentativesForQuiz,
} from "@/lib/db/queries/quiz-tentatives";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTentativesForQuiz", () => {
  it("returns the rows from the db query as-is", async () => {
    const rows = [{ id: "t1", score: 3, totalQuestions: 5 }];
    mocks.tentativesFindMany.mockResolvedValue(rows);

    const result = await getTentativesForQuiz("quiz-1", "user-1");

    expect(result).toBe(rows);
  });
});

describe("getQuizAttemptsSummary", () => {
  it("groups attempts by quiz, keeping the last completion date and the best score", async () => {
    const quizA = { id: "quiz-a", title: "A", passingScore: 80, thematique: {} };
    const quizB = { id: "quiz-b", title: "B", passingScore: 80, thematique: {} };
    mocks.tentativesFindMany.mockResolvedValue([
      // Most recent first (matches the orderBy desc(completedAt) used in the query).
      {
        quizId: "quiz-a",
        quiz: quizA,
        score: 3,
        totalQuestions: 10,
        completedAt: new Date("2026-01-03"),
      },
      {
        quizId: "quiz-b",
        quiz: quizB,
        score: 9,
        totalQuestions: 10,
        completedAt: new Date("2026-01-02"),
      },
      {
        quizId: "quiz-a",
        quiz: quizA,
        score: 8,
        totalQuestions: 10,
        completedAt: new Date("2026-01-01"),
      },
    ]);

    const summary = await getQuizAttemptsSummary("user-1");

    expect(summary.map((s) => s.quiz.id)).toEqual(["quiz-a", "quiz-b"]);
    const a = summary.find((s) => s.quiz.id === "quiz-a")!;
    expect(a.attemptsCount).toBe(2);
    expect(a.lastScore).toBe(3);
    expect(a.lastTotal).toBe(10);
    expect(a.bestScore).toBe(8);
    expect(a.bestTotal).toBe(10);
  });

  it("returns an empty array when the user has no attempts", async () => {
    mocks.tentativesFindMany.mockResolvedValue([]);

    const summary = await getQuizAttemptsSummary("user-1");

    expect(summary).toEqual([]);
  });
});

describe("getQuizSubmissionStats", () => {
  it("computes the attempt count, distinct students and average percent", async () => {
    mocks.tentativesFindMany.mockResolvedValue([
      {
        userId: "user-1",
        score: 10,
        totalQuestions: 10,
        completedAt: new Date("2026-01-03"),
        user: { id: "user-1", fullName: "Alice", email: "alice@test.com" },
      },
      {
        userId: "user-1",
        score: 5,
        totalQuestions: 10,
        completedAt: new Date("2026-01-01"),
        user: { id: "user-1", fullName: "Alice", email: "alice@test.com" },
      },
      {
        userId: "user-2",
        score: 5,
        totalQuestions: 10,
        completedAt: new Date("2026-01-02"),
        user: { id: "user-2", fullName: "Bob", email: "bob@test.com" },
      },
    ]);

    const stats = await getQuizSubmissionStats("quiz-1");

    expect(stats.attemptsCount).toBe(3);
    expect(stats.uniqueUsersCount).toBe(2);
    expect(stats.averagePercent).toBeCloseTo((100 + 50 + 50) / 3);
  });

  it("returns a null average when there are no attempts", async () => {
    mocks.tentativesFindMany.mockResolvedValue([]);

    const stats = await getQuizSubmissionStats("quiz-1");

    expect(stats.attemptsCount).toBe(0);
    expect(stats.uniqueUsersCount).toBe(0);
    expect(stats.averagePercent).toBeNull();
    expect(stats.students).toEqual([]);
  });

  it("groups attempts by student, keeping every attempt and the best score", async () => {
    mocks.tentativesFindMany.mockResolvedValue([
      // Most recent first (matches the orderBy desc(completedAt) used in the query).
      {
        userId: "user-1",
        score: 5,
        totalQuestions: 10,
        completedAt: new Date("2026-01-03"),
        user: { id: "user-1", fullName: "Alice", email: "alice@test.com" },
      },
      {
        userId: "user-2",
        score: 10,
        totalQuestions: 10,
        completedAt: new Date("2026-01-02"),
        user: { id: "user-2", fullName: "Bob", email: "bob@test.com" },
      },
      {
        userId: "user-1",
        score: 10,
        totalQuestions: 10,
        completedAt: new Date("2026-01-01"),
        user: { id: "user-1", fullName: "Alice", email: "alice@test.com" },
      },
    ]);

    const stats = await getQuizSubmissionStats("quiz-1");

    expect(stats.students.map((s) => s.user.fullName)).toEqual([
      "Alice",
      "Bob",
    ]);
    const alice = stats.students.find((s) => s.user.fullName === "Alice")!;
    expect(alice.attemptsCount).toBe(2);
    expect(alice.bestScore).toBe(10);
    expect(alice.bestTotal).toBe(10);
    expect(alice.lastCompletedAt).toEqual(new Date("2026-01-03"));
    expect(alice.attempts).toHaveLength(2);
  });
});

describe("getQuizQuestionStats", () => {
  it("computes a per-question success rate across all attempts of the quiz", async () => {
    mocks.questionsFindMany.mockResolvedValue([
      {
        id: "q1",
        prompt: "Q1",
        choix: [
          { id: "correct", isCorrect: true },
          { id: "wrong", isCorrect: false },
        ],
      },
    ]);
    mocks.tentativesFindMany.mockResolvedValue([
      { id: "t1" },
      { id: "t2" },
      { id: "t3" },
    ]);
    mocks.reponsesFindMany.mockResolvedValue([
      { tentativeId: "t1", questionId: "q1", choixId: "correct" },
      { tentativeId: "t2", questionId: "q1", choixId: "wrong" },
      // t3 answered nothing for q1 -> counts as incorrect, not excluded.
    ]);

    const stats = await getQuizQuestionStats("quiz-1");

    expect(stats).toEqual([
      { questionId: "q1", prompt: "Q1", correctCount: 1, totalCount: 3 },
    ]);
  });

  it("returns an empty array when the quiz has no questions", async () => {
    mocks.questionsFindMany.mockResolvedValue([]);

    const stats = await getQuizQuestionStats("quiz-1");

    expect(stats).toEqual([]);
  });
});

describe("getTentativeDetail", () => {
  it("returns null when the attempt does not belong to the user", async () => {
    mocks.tentativesFindFirst.mockResolvedValue(undefined);

    const detail = await getTentativeDetail("tentative-1", "user-1");

    expect(detail).toBeNull();
  });

  it("rebuilds corrections from the stored answers", async () => {
    mocks.tentativesFindFirst.mockResolvedValue({
      id: "tentative-1",
      quizId: "quiz-1",
      score: 1,
      totalQuestions: 1,
      quiz: { id: "quiz-1", title: "Quiz" },
      reponses: [{ questionId: "q1", choixId: "choix-correct" }],
    });
    mocks.questionsFindMany.mockResolvedValue([
      {
        id: "q1",
        prompt: "Question ?",
        explanation: "Parce que.",
        choix: [
          { id: "choix-correct", label: "Bonne réponse", isCorrect: true },
          { id: "choix-wrong", label: "Mauvaise réponse", isCorrect: false },
        ],
      },
    ]);

    const detail = await getTentativeDetail("tentative-1", "user-1");

    expect(detail?.corrections).toEqual([
      {
        questionId: "q1",
        prompt: "Question ?",
        explanation: "Parce que.",
        selectedChoixIds: ["choix-correct"],
        choix: [
          { id: "choix-correct", label: "Bonne réponse", isCorrect: true },
          { id: "choix-wrong", label: "Mauvaise réponse", isCorrect: false },
        ],
      },
    ]);
  });
});
