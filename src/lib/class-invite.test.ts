import { describe, expect, it } from "vitest";

import { generateInviteCode, normalizeInviteCode } from "@/lib/class-invite";

describe("generateInviteCode", () => {
  it("produces 8 unambiguous uppercase characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateInviteCode()).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    }
  });
});

describe("normalizeInviteCode", () => {
  it("uppercases and strips spaces and dashes", () => {
    expect(normalizeInviteCode(" abcd-ef 23 ")).toBe("ABCDEF23");
  });
});
