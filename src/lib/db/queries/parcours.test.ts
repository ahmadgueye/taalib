import { describe, expect, it, vi } from "vitest";

import {
  getParcoursProgress,
  type ParcoursWithProgress,
} from "@/lib/db/queries/parcours";
import type { QuizScore } from "@/lib/db/queries/quiz-tentatives";

const { getQuizScoresMock, getCompletedRessourceIdsMock } = vi.hoisted(() => ({
  getQuizScoresMock: vi.fn(),
  getCompletedRessourceIdsMock: vi.fn(),
}));

vi.mock("@/lib/db/queries/quiz-tentatives", () => ({
  getQuizScores: getQuizScoresMock,
}));

vi.mock("@/lib/db/queries/progress", () => ({
  getCompletedRessourceIds: getCompletedRessourceIdsMock,
}));

function etape({
  id,
  quiz = [],
  ressources = [],
}: {
  id: string;
  quiz?: { id: string; passingScore: number }[];
  ressources?: { id: string }[];
}) {
  return {
    id,
    thematique: {
      id: `thematique-${id}`,
      slug: `thematique-${id}`,
      title: `Thématique ${id}`,
      description: null,
      cours: { id: "cours-1", slug: "cours-1", title: "Cours" },
      quiz,
      ressources,
    },
  };
}

function parcoursWith(
  etapes: ReturnType<typeof etape>[]
): ParcoursWithProgress {
  return { etapes } as unknown as ParcoursWithProgress;
}

function score(bestScore: number, bestTotal: number): QuizScore {
  return { lastScore: bestScore, lastTotal: bestTotal, bestScore, bestTotal, attemptsCount: 1 };
}

describe("getParcoursProgress", () => {
  it("never marks a step as completed for an anonymous visitor, even without a quiz gate", async () => {
    getQuizScoresMock.mockResolvedValue(new Map());
    getCompletedRessourceIdsMock.mockResolvedValue(new Set());

    const parcours = parcoursWith([
      etape({ id: "1" }), // no quiz -> would auto-complete for a logged-in user
      etape({ id: "2", quiz: [{ id: "q2", passingScore: 80 }] }),
    ]);

    const steps = await getParcoursProgress(parcours, null);

    expect(steps.map((s) => s.state)).toEqual(["active", "locked"]);
    expect(steps.some((s) => s.state === "completed")).toBe(false);
    expect(getQuizScoresMock).not.toHaveBeenCalled();
    expect(getCompletedRessourceIdsMock).not.toHaveBeenCalled();
  });

  it("auto-completes a quiz-less step for a logged-in user and unlocks the next one", async () => {
    getQuizScoresMock.mockResolvedValue(new Map());
    getCompletedRessourceIdsMock.mockResolvedValue(new Set());

    const parcours = parcoursWith([
      etape({ id: "1" }),
      etape({ id: "2", quiz: [{ id: "q2", passingScore: 80 }] }),
    ]);

    const steps = await getParcoursProgress(parcours, "user-1");

    expect(steps.map((s) => s.state)).toEqual(["completed", "active"]);
  });

  it("locks a step behind an unmet passing score", async () => {
    getQuizScoresMock.mockResolvedValue(
      new Map([["q1", score(6, 10)]]) // 60%, below the 80% threshold
    );
    getCompletedRessourceIdsMock.mockResolvedValue(new Set());

    const parcours = parcoursWith([
      etape({ id: "1", quiz: [{ id: "q1", passingScore: 80 }] }),
      etape({ id: "2", quiz: [{ id: "q2", passingScore: 80 }] }),
    ]);

    const steps = await getParcoursProgress(parcours, "user-1");

    expect(steps.map((s) => s.state)).toEqual(["active", "locked"]);
  });

  it("unlocks the next step once the passing score is met", async () => {
    getQuizScoresMock.mockResolvedValue(new Map([["q1", score(9, 10)]]));
    getCompletedRessourceIdsMock.mockResolvedValue(new Set());

    const parcours = parcoursWith([
      etape({ id: "1", quiz: [{ id: "q1", passingScore: 80 }] }),
      etape({ id: "2", quiz: [{ id: "q2", passingScore: 80 }] }),
    ]);

    const steps = await getParcoursProgress(parcours, "user-1");

    expect(steps.map((s) => s.state)).toEqual(["completed", "active"]);
  });

  it("reports resource reading progress only for the active step", async () => {
    getQuizScoresMock.mockResolvedValue(new Map());
    getCompletedRessourceIdsMock.mockResolvedValue(new Set(["r1"]));

    const parcours = parcoursWith([
      etape({
        id: "1",
        quiz: [{ id: "q1", passingScore: 80 }],
        ressources: [{ id: "r1" }, { id: "r2" }],
      }),
    ]);

    const steps = await getParcoursProgress(parcours, "user-1");

    expect(steps[0].state).toBe("active");
    expect(steps[0].ressourceProgress).toEqual({ completed: 1, total: 2 });
  });
});
