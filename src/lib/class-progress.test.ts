import { describe, expect, it } from "vitest";

import {
  buildClassProgress,
  isInactive,
  type ClassProgressInput,
} from "@/lib/class-progress";
import type { QuranChapter } from "@/lib/quran/types";

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

const chapter = (id: number, versesCount: number): QuranChapter => ({
  id,
  nameSimple: `Sourate ${id}`,
  nameArabic: "",
  nameTranslated: "",
  versesCount,
  firstPage: 1,
  lastPage: 1,
  hasBismillah: true,
});

function input(overrides: Partial<ClassProgressInput> = {}): ClassProgressInput {
  return {
    members: [{ userId: "u1", email: "a@x.test", fullName: "Aïcha", leftAt: null }],
    ressources: [],
    quiz: [],
    completions: [],
    attempts: [],
    memorization: [],
    chapters: [chapter(1, 7), chapter(112, 4)],
    ...overrides,
  };
}

describe("buildClassProgress", () => {
  it("counts lessons read among those unlocked for the class only", () => {
    const [row] = buildClassProgress(
      input({
        ressources: [
          { id: "r1", unlockedAt: day(1) },
          { id: "r2", unlockedAt: day(2) },
        ],
        completions: [
          { userId: "u1", ressourceId: "r1", completedAt: day(3) },
          // Lue ailleurs (autre classe, contenu public) : hors périmètre.
          { userId: "u1", ressourceId: "autre", completedAt: day(4) },
          { userId: "u2", ressourceId: "r2", completedAt: day(4) },
        ],
      })
    );
    expect(row.lessons).toEqual({ read: 1, total: 2 });
  });

  it("counts a quiz as passed on the best attempt, and averages best scores of attempted quizzes", () => {
    const [row] = buildClassProgress(
      input({
        quiz: [
          { id: "q1", unlockedAt: day(1), passingScore: 80 },
          { id: "q2", unlockedAt: day(1), passingScore: 80 },
          { id: "q3", unlockedAt: day(1), passingScore: 80 },
        ],
        attempts: [
          { userId: "u1", quizId: "q1", score: 5, totalQuestions: 10, completedAt: day(2) },
          { userId: "u1", quizId: "q1", score: 9, totalQuestions: 10, completedAt: day(3) },
          { userId: "u1", quizId: "q2", score: 3, totalQuestions: 5, completedAt: day(3) },
        ],
      })
    );
    // q1 : meilleur 90 % (réussi) ; q2 : 60 % ; q3 : pas tenté.
    expect(row.quiz).toEqual({ passed: 1, total: 3, averageScore: 75 });
  });

  it("has no average when no quiz was attempted", () => {
    const [row] = buildClassProgress(
      input({ quiz: [{ id: "q1", unlockedAt: day(1), passingScore: 80 }] })
    );
    expect(row.quiz).toEqual({ passed: 0, total: 1, averageScore: null });
  });

  it("judges a former student only on what was unlocked before they left", () => {
    const [row] = buildClassProgress(
      input({
        members: [{ userId: "u1", email: "a@x.test", fullName: null, leftAt: day(5) }],
        ressources: [
          { id: "r1", unlockedAt: day(1) },
          { id: "r2", unlockedAt: day(10) },
        ],
        quiz: [{ id: "q1", unlockedAt: day(10), passingScore: 80 }],
      })
    );
    expect(row.lessons.total).toBe(1);
    expect(row.quiz.total).toBe(0);
    expect(row.name).toBe("a@x.test");
  });

  it("weighs memorization by words, like /memorisation, and counts verses to reinforce", () => {
    const [full, none] = buildClassProgress(
      input({
        members: [
          { userId: "u1", email: "a@x.test", fullName: "A", leftAt: null },
          { userId: "u2", email: "b@x.test", fullName: "B", leftAt: null },
        ],
        chapters: [chapter(1, 7)],
        memorization: [
          { userId: "u1", chapterId: 1, status: "maitrise", count: 5, lastUpdatedAt: day(2) },
          { userId: "u1", chapterId: 1, status: "a_renforcer", count: 2, lastUpdatedAt: day(3) },
        ],
      })
    );
    expect(full.quran.percent).toBeCloseTo((5 / 7) * 100);
    expect(full.quran.aRenforcer).toBe(2);
    expect(none.quran).toEqual({ percent: 0, aRenforcer: 0 });
  });

  it("takes the latest of lessons, quizzes and memorization as last activity", () => {
    const [row] = buildClassProgress(
      input({
        completions: [{ userId: "u1", ressourceId: "autre", completedAt: day(3) }],
        attempts: [
          { userId: "u1", quizId: "q", score: 1, totalQuestions: 1, completedAt: day(8) },
        ],
        memorization: [
          { userId: "u1", chapterId: 1, status: "en_cours", count: 1, lastUpdatedAt: day(5) },
        ],
      })
    );
    expect(row.lastActivityAt).toEqual(day(8));
    expect(buildClassProgress(input())[0].lastActivityAt).toBeNull();
  });
});

describe("isInactive", () => {
  it("flags students without activity for more than 7 days, or with none", () => {
    expect(isInactive(day(1), day(8))).toBe(false);
    expect(isInactive(day(1), day(9))).toBe(true);
    expect(isInactive(null, day(1))).toBe(true);
  });
});
