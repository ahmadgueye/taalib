import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ parse: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status = 500;
  }
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  class Anthropic {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
    beta = { messages: { parse: mocks.parse } };
  }
  return { default: Anthropic };
});
vi.mock("@anthropic-ai/sdk/helpers/beta/zod", () => ({
  betaZodOutputFormat: () => ({}),
}));

import Anthropic from "@anthropic-ai/sdk";

import { generateQuestions, keepValidQuestions } from "@/lib/quiz-generation";

const lessons = [{ title: "Les piliers", content: "L'islam a cinq piliers." }];

const good = {
  prompt: "Combien y a-t-il de piliers ?",
  type: "qcm" as const,
  explanation: "La leçon en cite cinq.",
  choix: [
    { label: "Cinq", isCorrect: true },
    { label: "Trois", isCorrect: false },
  ],
};

beforeEach(() => {
  mocks.parse.mockReset();
});

describe("keepValidQuestions", () => {
  it("drops questions the editor would reject", () => {
    const { questions, dropped } = keepValidQuestions([
      good,
      { ...good, choix: [{ label: "Cinq", isCorrect: false }] },
      { ...good, prompt: " " },
      {
        ...good,
        type: "vrai_faux",
        choix: [
          { label: "Oui", isCorrect: true },
          { label: "Non", isCorrect: false },
        ],
      },
    ]);
    expect(questions).toEqual([good]);
    expect(dropped).toBe(3);
  });

  it("puts Vrai before Faux", () => {
    const { questions } = keepValidQuestions([
      {
        ...good,
        type: "vrai_faux",
        choix: [
          { label: "Faux", isCorrect: true },
          { label: "Vrai", isCorrect: false },
        ],
      },
    ]);
    expect(questions[0].choix).toEqual([
      { label: "Vrai", isCorrect: false },
      { label: "Faux", isCorrect: true },
    ]);
  });
});

describe("generateQuestions", () => {
  it("returns the valid generated questions", async () => {
    mocks.parse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { questions: [good] },
    });
    const result = await generateQuestions({
      lessons,
      count: 5,
      instructions: "Insiste sur la prière.",
    });
    expect(result).toEqual({ questions: [good], dropped: 0 });
    const request = mocks.parse.mock.calls[0][0];
    expect(request.fallbacks).toBe("default");
    expect(request.messages[0].content).toContain(
      '<lecon titre="Les piliers">'
    );
    expect(request.messages[0].content).toContain("Écris 5 questions");
    expect(request.messages[0].content).toContain("Insiste sur la prière.");
  });

  it("reports a refusal", async () => {
    mocks.parse.mockResolvedValue({
      stop_reason: "refusal",
      parsed_output: null,
    });
    expect(
      await generateQuestions({ lessons, count: 5, instructions: "" })
    ).toEqual({ error: "Le modèle a refusé de générer ces questions." });
  });

  it("turns API errors into a message", async () => {
    mocks.parse.mockRejectedValue(new Anthropic.AuthenticationError(401, undefined, "bad", new Headers()));
    expect(
      await generateQuestions({ lessons, count: 5, instructions: "" })
    ).toEqual({ error: "Clé API Anthropic invalide." });
  });

  it("does not call the API for empty lessons", async () => {
    expect(
      await generateQuestions({
        lessons: [{ title: "Vide", content: "" }],
        count: 5,
        instructions: "",
      })
    ).toEqual({ error: "Les leçons choisies sont vides." });
    expect(mocks.parse).not.toHaveBeenCalled();
  });
});
