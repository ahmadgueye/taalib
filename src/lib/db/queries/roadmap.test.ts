import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContentAccess } from "@/lib/content-access";

const mocks = vi.hoisted(() => ({
  classCoursRows: vi.fn(),
  coursFindMany: vi.fn(),
  completedIds: vi.fn(),
  quizScores: vi.fn(),
  unlockDates: vi.fn(),
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
vi.mock("@/lib/db/queries/content-access", () => ({
  getUnlockDates: mocks.unlockDates,
}));
vi.mock("@/lib/db/queries/quiz-tentatives", () => ({
  getQuizScores: mocks.quizScores,
}));

import { getStudentRoadmap } from "@/lib/db/queries/roadmap";

function thematique(
  id: string,
  ressourceIds: string[],
  quiz: { id: string; passingScore: number; title?: string }[] = []
) {
  return {
    id,
    slug: id,
    title: id,
    description: null,
    ressources: ressourceIds.map((r) => ({ id: r, title: r })),
    quiz: quiz.map((q) => ({ title: q.id, ...q })),
  };
}

function access(overrides: Partial<Extract<ContentAccess, { all: false }>>) {
  return {
    all: false,
    inAnyClass: true,
    coursIds: new Set(["aqida", "fiqh"]),
    activeCoursIds: new Set(["aqida", "fiqh"]),
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
  mocks.unlockDates.mockResolvedValue(new Map());
});

describe("getStudentRoadmap", () => {
  it("follows the class's cours order, each cours once", async () => {
    const { cours: roadmap } = await getStudentRoadmap("u1", access({}));
    expect(roadmap.map((c) => c.id)).toEqual(["fiqh", "aqida"]);
  });

  it("returns nothing for a student whose classes follow no cours", async () => {
    mocks.classCoursRows.mockResolvedValue([]);
    expect(await getStudentRoadmap("u1", access({}))).toEqual({
      cours: [],
      todo: [],
    });
    expect(mocks.coursFindMany).not.toHaveBeenCalled();
  });

  it("shows not-yet-unlocked thematiques as upcoming, with all their lessons counted", async () => {
    const { cours: roadmap } = await getStudentRoadmap(
      "u1",
      access({ thematiqueIds: new Set(["tawhid"]), ressourceIds: new Set(["r1"]) })
    );
    const aqida = roadmap.find((c) => c.id === "aqida")!;
    expect(aqida.steps.map((s) => s.state)).toEqual(["active", "upcoming"]);
    expect(aqida.steps[0].ressourceProgress).toEqual({ completed: 0, total: 2 });
    expect(aqida.steps[0].quizCount).toBe(1);
  });

  it("completes a step only once everything is unlocked, read and passed", async () => {
    const everything = access({
      thematiqueIds: new Set(["tawhid"]),
      ressourceIds: new Set(["r1", "r2"]),
      quizIds: new Set(["q1"]),
    });
    mocks.completedIds.mockResolvedValue(new Set(["r1", "r2"]));

    // Tout lu, quiz pas encore réussi : en cours.
    let aqida = (await getStudentRoadmap("u1", everything)).cours.find((c) => c.id === "aqida")!;
    expect(aqida.steps[0].state).toBe("active");

    // Quiz réussi : terminée.
    mocks.quizScores.mockResolvedValue(
      new Map([["q1", { bestScore: 9, bestTotal: 10 }]])
    );
    aqida = (await getStudentRoadmap("u1", everything)).cours.find((c) => c.id === "aqida")!;
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
    ).cours.find((c) => c.id === "aqida")!;
    expect(aqida.steps[0].state).toBe("active");
  });

  it("keeps only the unlocked steps of a cours from a finished class", async () => {
    mocks.classCoursRows.mockResolvedValue([
      { coursId: "aqida", leftAt: new Date("2026-06-01") },
      { coursId: "fiqh", leftAt: new Date("2026-06-01") },
    ]);
    const { cours: roadmap } = await getStudentRoadmap(
      "u1",
      access({ thematiqueIds: new Set(["tawhid"]), ressourceIds: new Set(["r1"]) })
    );
    // Fiqh : rien de débloqué avant le départ, le cours disparaît.
    expect(roadmap.map((c) => c.id)).toEqual(["aqida"]);
    expect(roadmap[0].steps.map((s) => s.thematique.id)).toEqual(["tawhid"]);
  });

  it("lists every unread unlocked lesson, then the quiz once its lessons are read", async () => {
    const unlocked = access({
      thematiqueIds: new Set(["priere", "tawhid"]),
      ressourceIds: new Set(["r4", "r1", "r2"]),
      quizIds: new Set(["q1"]),
    });
    const ids = async () =>
      (await getStudentRoadmap("u1", unlocked)).todo.map((t) => [t.kind, t.id]);

    // Deux cours avancent en parallèle, dans l'ordre de la feuille de route ;
    // le quiz attend que les leçons de sa thématique soient lues.
    expect(await ids()).toEqual([
      ["ressource", "r4"],
      ["ressource", "r1"],
      ["ressource", "r2"],
    ]);

    mocks.completedIds.mockResolvedValue(new Set(["r4", "r1"]));
    expect(await ids()).toEqual([["ressource", "r2"]]);

    mocks.completedIds.mockResolvedValue(new Set(["r4", "r1", "r2"]));
    expect(await ids()).toEqual([["quiz", "q1"]]);

    mocks.quizScores.mockResolvedValue(
      new Map([["q1", { bestScore: 10, bestTotal: 10 }]])
    );
    expect(await ids()).toEqual([]);
  });

  it("flags what was unlocked this week and is not done yet as new", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    mocks.unlockDates.mockResolvedValue(
      new Map([
        ["r1", new Date("2026-10-01")], // trop ancien
        ["r2", new Date("2026-10-24")],
        ["q1", new Date("2026-10-25")],
      ])
    );
    mocks.completedIds.mockResolvedValue(new Set(["r1"]));
    const unlocked = access({
      thematiqueIds: new Set(["tawhid"]),
      ressourceIds: new Set(["r1", "r2"]),
      quizIds: new Set(["q1"]),
    });

    let roadmap = await getStudentRoadmap("u1", unlocked, now);
    let aqida = roadmap.cours.find((c) => c.id === "aqida")!;
    expect(aqida.steps[0].newCount).toBe(2);
    expect(roadmap.todo).toMatchObject([{ id: "r2", isNew: true }]);
    // r1 est lue ; q1 attend que r2 le soit.

    // Une fois lue, la leçon n'est plus signalée.
    mocks.completedIds.mockResolvedValue(new Set(["r1", "r2"]));
    roadmap = await getStudentRoadmap("u1", unlocked, now);
    aqida = roadmap.cours.find((c) => c.id === "aqida")!;
    expect(aqida.steps[0].newCount).toBe(1);
  });
});
