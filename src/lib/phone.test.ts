import { describe, expect, it } from "vitest";

import { formatPhone, phoneCountries, splitPhone, toE164 } from "./phone";

describe("toE164", () => {
  it("convertit un numéro national pour le pays choisi", () => {
    expect(toE164("SN", "77 123 45 67")).toBe("+221771234567");
    expect(toE164("FR", "06 12 34 56 78")).toBe("+33612345678");
  });

  it("laisse l'indicatif saisi l'emporter sur le pays choisi", () => {
    expect(toE164("SN", "+33 6 12 34 56 78")).toBe("+33612345678");
    expect(toE164("SN", "0033612345678")).toBe("+33612345678");
  });

  it("refuse un numéro invalide pour le pays", () => {
    expect(toE164("SN", "12 345 67 89")).toBeNull();
    expect(toE164("SN", "77 123")).toBeNull();
    expect(toE164("FR", "abc")).toBeNull();
    expect(toE164("SN", "")).toBeNull();
  });

  it("se rabat sur le Sénégal pour un pays inconnu", () => {
    expect(toE164("XX", "77 123 45 67")).toBe("+221771234567");
  });
});

describe("splitPhone", () => {
  it("retrouve le pays et le numéro national d'un numéro enregistré", () => {
    expect(splitPhone("+33612345678")).toEqual({
      country: "FR",
      national: "06 12 34 56 78",
    });
  });

  it("garde tel quel un ancien numéro illisible", () => {
    expect(splitPhone("abc")).toEqual({ country: "SN", national: "abc" });
  });

  it("part du Sénégal sans numéro", () => {
    expect(splitPhone(null)).toEqual({ country: "SN", national: "" });
  });
});

describe("formatPhone", () => {
  it("affiche un numéro au format international", () => {
    expect(formatPhone("+221771234567")).toBe("+221 77 123 45 67");
  });

  it("affiche tel quel un ancien numéro illisible", () => {
    expect(formatPhone("abc")).toBe("abc");
  });
});

describe("phoneCountries", () => {
  it("nomme les pays en français, triés par nom", () => {
    const countries = phoneCountries();
    expect(countries.find((c) => c.code === "SN")).toMatchObject({
      name: "Sénégal",
      callingCode: "221",
    });
    const names = countries.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "fr")));
  });
});
