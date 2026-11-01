import { describe, expect, it } from "vitest";

import {
  estimateGenerationCost,
  formatCost,
  usageCost,
} from "@/lib/quiz-generation-cost";

describe("estimateGenerationCost", () => {
  it("grows with the lessons and the number of questions", () => {
    const base = estimateGenerationCost(3000, 10);
    expect(estimateGenerationCost(6000, 10)).toBeGreaterThan(base);
    expect(estimateGenerationCost(3000, 20)).toBeGreaterThan(base);
  });

  it("stays in the expected range for a typical quiz", () => {
    const cost = estimateGenerationCost(3200, 10);
    expect(cost).toBeGreaterThan(0.05);
    expect(cost).toBeLessThan(0.3);
  });
});

describe("usageCost", () => {
  it("prices input, output and cache tokens", () => {
    expect(
      usageCost({
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 1_000_000,
        cache_read_input_tokens: 1_000_000,
      })
    ).toBeCloseTo(4 + 20 + 5 + 0.2);
  });
});

describe("formatCost", () => {
  it("formats dollars the French way", () => {
    expect(formatCost(0.137)).toBe("0,14 $");
    expect(formatCost(0.004)).toBe("moins de 0,01 $");
  });
});
