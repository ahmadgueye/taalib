import { describe, expect, it } from "vitest";

import { attemptsLeft, canSeeCorrections } from "@/lib/quiz-attempts";

describe("attemptsLeft", () => {
  it("is unlimited without a limit", () => {
    expect(attemptsLeft(null, 0, 12)).toBeNull();
  });

  it("adds granted attempts and never goes below zero", () => {
    expect(attemptsLeft(3, 0, 1)).toBe(2);
    expect(attemptsLeft(3, 2, 4)).toBe(1);
    expect(attemptsLeft(2, 0, 5)).toBe(0);
  });
});

describe("canSeeCorrections", () => {
  const hidden = { maxAttempts: 3, hideCorrections: true };

  it("always shows them without the option or without a limit", () => {
    expect(
      canSeeCorrections(
        { maxAttempts: 3, hideCorrections: false },
        { left: 2, passed: false }
      )
    ).toBe(true);
    expect(
      canSeeCorrections(
        { maxAttempts: null, hideCorrections: true },
        { left: null, passed: false }
      )
    ).toBe(true);
  });

  it("waits for a pass or the last attempt", () => {
    expect(canSeeCorrections(hidden, { left: 2, passed: false })).toBe(false);
    expect(canSeeCorrections(hidden, { left: 2, passed: true })).toBe(true);
    expect(canSeeCorrections(hidden, { left: 0, passed: false })).toBe(true);
  });
});
