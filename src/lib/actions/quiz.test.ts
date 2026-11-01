import { beforeEach, describe, expect, it, vi } from "vitest";

import { quiz, quizChoix, quizQuestions } from "@/lib/db/schema";

const mocks = vi.hoisted(() => ({
  existing: [] as { id: string; choix: { id: string }[] }[],
  ops: [] as { op: string; table: unknown; values?: unknown }[],
}));

vi.mock("@/lib/auth/get-session", () => ({
  requireContributor: vi.fn(async () => ({ id: "editor-1" })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/actions/flash", () => ({ setFlash: vi.fn() }));
vi.mock("@/lib/actions/revalidate-tree", () => ({
  revalidateCoursTree: vi.fn(),
}));
vi.mock("@/lib/db/queries/quiz", () => ({
  getQuizWithQuestions: vi.fn(async () => null),
}));
vi.mock("@/lib/db", () => {
  let nextId = 0;
  const tx = {
    query: {
      quizQuestions: { findMany: async () => mocks.existing },
    },
    delete: (table: unknown) => ({
      where: async () => {
        mocks.ops.push({ op: "delete", table });
      },
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: async () => {
          mocks.ops.push({ op: "update", table, values });
        },
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        mocks.ops.push({ op: "insert", table, values });
        const returning = async () => [{ id: `new-${++nextId}` }];
        return Object.assign(Promise.resolve(), { returning });
      },
    }),
  };
  return {
    db: {
      transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
      update: tx.update,
    },
  };
});

import { reorderQuiz, updateQuiz } from "@/lib/actions/quiz";

const Q1 = "11111111-1111-4111-8111-111111111111";
const C1 = "22222222-2222-4222-8222-222222222222";
const C2 = "33333333-3333-4333-8333-333333333333";
const Q2 = "44444444-4444-4444-8444-444444444444";

function quizForm(questions: unknown[]) {
  const formData = new FormData();
  formData.set("title", "Les piliers");
  formData.set("description", "");
  formData.set("thematiqueId", "t1");
  formData.set("status", "published");
  formData.set("passingScore", "80");
  formData.set("questionsJson", JSON.stringify(questions));
  return formData;
}

function opsOn(table: unknown, op: string) {
  return mocks.ops.filter((o) => o.table === table && o.op === op);
}

beforeEach(() => {
  mocks.ops = [];
  mocks.existing = [
    { id: Q1, choix: [{ id: C1 }, { id: C2 }] },
    { id: Q2, choix: [] },
  ];
});

describe("updateQuiz", () => {
  it("updates kept questions and choices in place", async () => {
    const result = await updateQuiz(
      "quiz-1",
      undefined,
      quizForm([
        {
          id: Q1,
          prompt: "Premier pilier ?",
          type: "qcm",
          choix: [
            { id: C1, label: "La Shahada", isCorrect: true },
            { id: C2, label: "Le jeûne", isCorrect: false },
          ],
        },
      ])
    );

    expect(result).toMatchObject({ success: "Quiz enregistré." });
    expect(opsOn(quiz, "update")).toHaveLength(1);
    // Q2, retirée de l'éditeur, est supprimée ; Q1 est mise à jour.
    expect(opsOn(quizQuestions, "delete")).toHaveLength(1);
    expect(opsOn(quizQuestions, "insert")).toHaveLength(0);
    expect(opsOn(quizQuestions, "update")[0].values).toMatchObject({
      orderIndex: 0,
      prompt: "Premier pilier ?",
    });
    expect(opsOn(quizChoix, "update")).toHaveLength(2);
    expect(opsOn(quizChoix, "insert")).toHaveLength(0);
    expect(opsOn(quizChoix, "delete")).toHaveLength(0);
  });

  it("removes dropped choices and inserts new ones", async () => {
    await updateQuiz(
      "quiz-1",
      undefined,
      quizForm([
        {
          id: Q1,
          prompt: "Premier pilier ?",
          type: "qcm",
          choix: [
            { id: C1, label: "La Shahada", isCorrect: true },
            { label: "La prière", isCorrect: false },
          ],
        },
      ])
    );

    expect(opsOn(quizChoix, "delete")).toHaveLength(1);
    expect(opsOn(quizChoix, "update")).toHaveLength(1);
    expect(opsOn(quizChoix, "insert")[0].values).toMatchObject({
      questionId: Q1,
      label: "La prière",
      orderIndex: 1,
    });
  });

  it("treats an id from another quiz as a new question", async () => {
    await updateQuiz(
      "quiz-1",
      undefined,
      quizForm([
        {
          id: "55555555-5555-4555-8555-555555555555",
          prompt: "Nouvelle ?",
          type: "vrai_faux",
          choix: [
            { label: "Vrai", isCorrect: true },
            { label: "Faux", isCorrect: false },
          ],
        },
      ])
    );

    expect(opsOn(quizQuestions, "update")).toHaveLength(0);
    expect(opsOn(quizQuestions, "insert")).toHaveLength(1);
    expect(opsOn(quizChoix, "insert")).toHaveLength(2);
  });

  it("names the question at fault", async () => {
    const result = await updateQuiz(
      "quiz-1",
      undefined,
      quizForm([
        {
          prompt: "Ok ?",
          type: "qcm",
          choix: [
            { label: "A", isCorrect: true },
            { label: "B", isCorrect: false },
          ],
        },
        {
          prompt: "",
          type: "qcm",
          choix: [
            { label: "A", isCorrect: true },
            { label: "B", isCorrect: false },
          ],
        },
      ])
    );

    expect(result).toEqual({
      error: "Question 2 : Chaque question doit avoir un énoncé.",
    });
    expect(mocks.ops).toHaveLength(0);
  });
});

describe("reorderQuiz", () => {
  it("saves the quiz order given by the list", async () => {
    await reorderQuiz("t1", ["quiz-b", "quiz-a"]);
    expect(opsOn(quiz, "update").map((o) => o.values)).toMatchObject([
      { orderIndex: 0 },
      { orderIndex: 1 },
    ]);
  });
});
