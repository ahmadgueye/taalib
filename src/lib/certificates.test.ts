import { describe, expect, it } from "vitest";

import {
  certificatePath,
  generateCertificateCode,
  normalizeCertificateCode,
  validationSummary,
} from "@/lib/certificates";

describe("generateCertificateCode", () => {
  it("produces TAA- and two groups of 4 unambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCertificateCode()).toMatch(
        /^TAA-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/
      );
    }
  });

  it("does not repeat itself", () => {
    const codes = new Set(
      Array.from({ length: 500 }, () => generateCertificateCode())
    );
    expect(codes.size).toBe(500);
  });
});

describe("normalizeCertificateCode", () => {
  it("uppercases and trims a typed code", () => {
    expect(normalizeCertificateCode(" taa-7k3m-q9xp ")).toBe("TAA-7K3M-Q9XP");
  });

  it("rejects anything that is not a certificate code", () => {
    expect(normalizeCertificateCode("TAA-7K3M")).toBeNull();
    expect(normalizeCertificateCode("TAA-0K3M-Q9XP")).toBeNull();
    expect(normalizeCertificateCode("../etc")).toBeNull();
  });
});

describe("certificatePath", () => {
  it("points to the public page", () => {
    expect(certificatePath("TAA-7K3M-Q9XP")).toBe("/certificats/TAA-7K3M-Q9XP");
  });
});

describe("validationSummary", () => {
  it("counts lessons and quizzes with French plurals", () => {
    expect(validationSummary(12, 3)).toBe("12 leçons lues et 3 quiz réussis");
    expect(validationSummary(1, 1)).toBe("1 leçon lue et 1 quiz réussi");
  });

  it("leaves quizzes out when the thematique had none", () => {
    expect(validationSummary(4, 0)).toBe("4 leçons lues");
  });
});
