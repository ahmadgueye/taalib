import { describe, expect, it } from "vitest";

import {
  countPendingQuizzes,
  filterQuizList,
  parseQuizListFilter,
  quizListStatus,
  type QuizListStatus,
} from "./quiz-list";

const rules = { passingScore: 80, maxAttempts: 2, extra: 0 };
const attempt = (bestScore: number, attemptsCount: number) => ({
  bestScore,
  bestTotal: 10,
  attemptsCount,
});

describe("quizListStatus", () => {
  it("met à faire un quiz jamais tenté", () => {
    expect(quizListStatus(rules)).toEqual({ status: "todo", left: 2 });
  });

  it("met à retenter un quiz raté avec des tentatives restantes", () => {
    expect(quizListStatus({ ...rules, score: attempt(5, 1) })).toEqual({
      status: "retry",
      left: 1,
    });
  });

  it("met en échec un quiz raté sans tentative restante", () => {
    expect(quizListStatus({ ...rules, score: attempt(5, 2) })).toEqual({
      status: "failed",
      left: 0,
    });
  });

  it("compte les tentatives accordées en plus", () => {
    expect(
      quizListStatus({ ...rules, extra: 1, score: attempt(5, 2) }).status,
    ).toBe("retry");
  });

  it("garde un quiz illimité à retenter", () => {
    expect(
      quizListStatus({ ...rules, maxAttempts: null, score: attempt(5, 9) }),
    ).toEqual({ status: "retry", left: null });
  });

  it("reconnaît un quiz réussi, même après la dernière tentative", () => {
    expect(quizListStatus({ ...rules, score: attempt(8, 2) }).status).toBe(
      "passed",
    );
  });
});

describe("filterQuizList", () => {
  const items: { id: string; status: QuizListStatus }[] = [
    { id: "a", status: "retry" },
    { id: "b", status: "passed" },
    { id: "c", status: "todo" },
    { id: "d", status: "failed" },
    { id: "e", status: "todo" },
  ];
  const ids = (filter: Parameters<typeof filterQuizList>[1]) =>
    filterQuizList(items, filter).map((i) => i.id);

  it("met d'abord les quiz jamais tentés dans « À faire »", () => {
    expect(ids("a-faire")).toEqual(["c", "e", "a"]);
  });

  it("liste les réussis", () => {
    expect(ids("reussis")).toEqual(["b"]);
  });

  it("liste tous les quiz ratés dans « Échoués »", () => {
    expect(ids("echoues")).toEqual(["a", "d"]);
  });

  it("compte pour la pastille les quiz à faire ou à retenter", () => {
    expect(countPendingQuizzes(items)).toBe(3);
  });
});

describe("parseQuizListFilter", () => {
  it("ouvre « À faire » par défaut ou pour une valeur inconnue", () => {
    expect(parseQuizListFilter(undefined)).toBe("a-faire");
    expect(parseQuizListFilter("n-importe")).toBe("a-faire");
    expect(parseQuizListFilter("reussis")).toBe("reussis");
  });
});
