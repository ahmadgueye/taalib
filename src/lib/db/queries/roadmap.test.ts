import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContentAccess } from "@/lib/content-access";

const mocks = vi.hoisted(() => ({
  classCoursRows: vi.fn(),
  coursFindMany: vi.fn(),
  completedIds: vi.fn(),
  quizScores: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({ orderBy: mocks.classCoursRows }),
        }),
      }),
    }),
    query: { cours: { findMany: mocks.coursFindMany } },
  },
}));
vi.mock("@/lib/db/queries/progress", () => ({
  getCompletedRessourceIds: mocks.completedIds,
}));
vi.mock("@/lib/db/queries/quiz-tentatives", () => ({
  getQuizScores: mocks.quizScores,
}));

import { getStudentRoadmap } from "@/lib/db/queries/roadmap";

function thematique(
  id: string,
  ressourceIds: string[],
  quiz: { id: string; passingScore: number }[] = []
) {
  return {
    id,
    slug: id,
    title: id,
    description: null,
    ressources: ressourceIds.map((r) => ({ id: r })),
    quiz,
  };
}

function access(overrides: Partial<Extract<ContentAccess, { all: false }>>) {
  return {
    all: false,
    inAnyClass: true,
    coursIds: new Set(["aqida", "fiqh"]),
    thematiqueIds: new Set<string>(),
    ressourceIds: new Set<string>(),
    quizIds: new Set<string>(),
    ...overrides,
  } as ContentAccess;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.classCoursRows.mockResolvedValue([
    { coursId: "fiqh", leftAt: null },
    { coursId: "aqida", leftAt: null },
    { coursId: "fiqh", leftAt: null }, // suivi par une deuxième classe de l'étudiant
  ]);
  mocks.coursFindMany.mockResolvedValue([
    {
      id: "aqida",
      slug: "aqida",
      title: "Aqida",
      thematiques: [
        thematique("tawhid", ["r1", "r2"], [{ id: "q1", passingScore: 80 }]),
        thematique("piliers", ["r3"]),
      ],
    },
    { id: "fiqh", slug: "fiqh", title: "Fiqh", thematiques: [thematique("priere", ["r4"])] },
  ]);
  mocks.completedIds.mockResolvedValue(new Set());
  mocks.quizScores.mockResolvedValue(new Map());
});

describe("getStudentRoadmap", () => {
  it("follows the class's cours order, each cours once", async () => {
    const roadmap = await getStudentRoadmap("u1", access({}));
    expect(roadmap.map((c) => c.id)).toEqual(["fiqh", "aqida"]);
  });

  it("returns nothing for a student whose classes follow no cours", async () => {
    mocks.classCoursRows.mockResolvedValue([]);
    expect(await getStudentRoadmap("u1", access({}))).toEqual([]);
    expect(mocks.coursFindMany).not.toHaveBeenCalled();
  });

  it("shows not-yet-unlocked thematiques as upcoming, with all their lessons counted", async () => {
    const roadmap = await getStudentRoadmap(
      "u1",
      access({ thematiqueIds: new Set(["tawhid"]), ressourceIds: new Set(["r1"]) })
    );
    const aqida = roadmap.find((c) => c.id === "aqida")!;
    expect(aqida.steps.map((s) => s.state)).toEqual(["active", "upcoming"]);
    expect(aqida.steps[0].ressourceProgress).toEqual({ completed: 0, total: 2 });
  });

  it("completes a step only once everything is unlocked, read and passed", async () => {
    const everything = access({
      thematiqueIds: new Set(["tawhid"]),
      ressourceIds: new Set(["r1", "r2"]),
      quizIds: new Set(["q1"]),
    });
    mocks.completedIds.mockResolvedValue(new Set(["r1", "r2"]));

    // Tout lu, quiz pas encore réussi : en cours.
    let aqida = (await getStudentRoadmap("u1", everything)).find((c) => c.id === "aqida")!;
    expect(aqida.steps[0].state).toBe("active");

    // Quiz réussi : terminée.
    mocks.quizScores.mockResolvedValue(
      new Map([["q1", { bestScore: 9, bestTotal: 10 }]])
    );
    aqida = (await getStudentRoadmap("u1", everything)).find((c) => c.id === "aqida")!;
    expect(aqida.steps[0].state).toBe("completed");

    // Même tout lu et réussi, une ressource encore verrouillée garde l'étape en cours.
    aqida = (
      await getStudentRoadmap(
        "u1",
        access({
          thematiqueIds: new Set(["tawhid"]),
          ressourceIds: new Set(["r1"]),
          quizIds: new Set(["q1"]),
        })
      )
    ).find((c) => c.id === "aqida")!;
    expect(aqida.steps[0].state).toBe("active");
  });

  it("keeps only the unlocked steps of a cours from a finished class", async () => {
    mocks.classCoursRows.mockResolvedValue([
      { coursId: "aqida", leftAt: new Date("2026-06-01") },
      { coursId: "fiqh", leftAt: new Date("2026-06-01") },
    ]);
    const roadmap = await getStudentRoadmap(
      "u1",
      access({ thematiqueIds: new Set(["tawhid"]), ressourceIds: new Set(["r1"]) })
    );
    // Fiqh : rien de débloqué avant le départ, le cours disparaît.
    expect(roadmap.map((c) => c.id)).toEqual(["aqida"]);
    expect(roadmap[0].steps.map((s) => s.thematique.id)).toEqual(["tawhid"]);
  });
});
