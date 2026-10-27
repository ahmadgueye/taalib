import { describe, expect, it } from "vitest";

import {
  canSeeCours,
  canSeeQuiz,
  canSeeRessource,
  canSeeSeance,
  canSeeThematique,
  noAccess,
  showsUpcoming,
  visibleItems,
  type ContentAccess,
} from "@/lib/content-access";

// Étudiant de la classe A : cours A suivi, une ressource et un quiz débloqués
// dans la thématique A1. Tout le reste appartient à la classe B ou est encore
// verrouillé.
const studentA: ContentAccess = {
  all: false,
  inAnyClass: true,
  coursIds: new Set(["cours-a"]),
  activeCoursIds: new Set(["cours-a"]),
  thematiqueIds: new Set(["them-a1"]),
  ressourceIds: new Set(["res-a1-1"]),
  quizIds: new Set(["quiz-a1"]),
};

describe("content access", () => {
  it("lets staff see everything", () => {
    const staff: ContentAccess = { all: true };
    expect(canSeeCours(staff, "cours-b")).toBe(true);
    expect(canSeeThematique(staff, "them-b1")).toBe(true);
    expect(canSeeRessource(staff, "res-b1-1")).toBe(true);
    expect(canSeeQuiz(staff, "quiz-b1")).toBe(true);
  });

  it("shows a visitor nothing", () => {
    expect(canSeeCours(noAccess, "cours-a")).toBe(false);
    expect(canSeeThematique(noAccess, "them-a1")).toBe(false);
    expect(canSeeRessource(noAccess, "res-a1-1")).toBe(false);
  });

  it("shows a student only what is unlocked for their classes", () => {
    expect(canSeeCours(studentA, "cours-a")).toBe(true);
    expect(canSeeCours(studentA, "cours-b")).toBe(false);
    expect(canSeeThematique(studentA, "them-a1")).toBe(true);
    expect(canSeeThematique(studentA, "them-a2")).toBe(false);
    expect(canSeeRessource(studentA, "res-a1-1")).toBe(true);
    expect(canSeeRessource(studentA, "res-a1-2")).toBe(false);
    expect(canSeeQuiz(studentA, "quiz-a1")).toBe(true);
    expect(canSeeQuiz(studentA, "quiz-b1")).toBe(false);
  });

  it("filters a thematique's ressources and quiz down to unlocked ones", () => {
    const thematique = {
      id: "them-a1",
      ressources: [{ id: "res-a1-1" }, { id: "res-a1-2" }],
      quiz: [{ id: "quiz-a1" }, { id: "quiz-a1-bis" }],
    };
    expect(visibleItems(studentA, thematique)).toEqual({
      id: "them-a1",
      ressources: [{ id: "res-a1-1" }],
      quiz: [{ id: "quiz-a1" }],
    });
    expect(visibleItems({ all: true }, thematique)).toBe(thematique);
  });

  it("shows what is still to come only in courses of active classes", () => {
    expect(showsUpcoming(studentA, "cours-a")).toBe(true);
    // Ancien élève : il garde le cours A, mais sa classe est terminée.
    const alumnus: ContentAccess = { ...studentA, activeCoursIds: new Set() };
    expect(showsUpcoming(alumnus, "cours-a")).toBe(false);
    expect(showsUpcoming({ all: true }, "cours-a")).toBe(false);
  });

  it("shows a seance only if it references something visible", () => {
    expect(
      canSeeSeance(studentA, { thematiqueIds: ["them-b1"], ressourceIds: [] })
    ).toBe(false);
    expect(
      canSeeSeance(studentA, { thematiqueIds: [], ressourceIds: ["res-a1-1"] })
    ).toBe(true);
  });
});
