import { describe, expect, it } from "vitest";

import {
  isProfileComplete,
  profileFormDefaults,
  profileInfoSchema,
  type ProfileInfo,
} from "./profile-info";

const complete: ProfileInfo = {
  role: "viewer",
  fullName: "Awa Diop",
  firstName: "Awa",
  lastName: "Diop",
  phone: "+221 77 123 45 67",
  address: "Dakar, Sénégal",
  birthDate: "2001-04-12",
};

const input = {
  firstName: "Awa",
  lastName: "Diop",
  phone: "+221 77 123 45 67",
  address: "Dakar",
  birthDate: "2001-04-12",
};

describe("isProfileComplete", () => {
  it("demande toutes les informations à un étudiant", () => {
    expect(isProfileComplete(complete)).toBe(true);
    expect(isProfileComplete({ ...complete, phone: null })).toBe(false);
    expect(isProfileComplete({ ...complete, address: "  " })).toBe(false);
    expect(isProfileComplete({ ...complete, birthDate: null })).toBe(false);
  });

  it("considère incomplet un étudiant inscrit avec seulement son nom", () => {
    expect(
      isProfileComplete({
        role: "viewer",
        fullName: "Awa Diop",
        firstName: null,
        lastName: null,
        phone: null,
        address: null,
        birthDate: null,
      }),
    ).toBe(false);
  });

  it("ne demande que le nom au staff", () => {
    const staff: ProfileInfo = {
      role: "contributor",
      fullName: "Prof",
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      birthDate: null,
    };
    expect(isProfileComplete(staff)).toBe(true);
    expect(isProfileComplete({ ...staff, fullName: null })).toBe(false);
  });
});

describe("profileFormDefaults", () => {
  it("découpe le nom complet d'un ancien profil", () => {
    expect(
      profileFormDefaults({
        ...complete,
        firstName: null,
        lastName: null,
        fullName: "Awa Fatou Diop",
      }),
    ).toMatchObject({ firstName: "Awa", lastName: "Fatou Diop" });
  });
});

describe("profileInfoSchema", () => {
  const student = profileInfoSchema({ staff: false });
  const staff = profileInfoSchema({ staff: true });

  it("accepte un profil étudiant complet", () => {
    expect(student.safeParse(input).success).toBe(true);
  });

  it("refuse un champ étudiant vide", () => {
    expect(student.safeParse({ ...input, address: " " }).success).toBe(false);
    expect(student.safeParse({ ...input, birthDate: "" }).success).toBe(false);
  });

  it("refuse un téléphone ou une date invalide", () => {
    expect(student.safeParse({ ...input, phone: "abc" }).success).toBe(false);
    expect(
      student.safeParse({ ...input, birthDate: "1850-01-01" }).success,
    ).toBe(false);
    expect(
      student.safeParse({ ...input, birthDate: "2999-01-01" }).success,
    ).toBe(false);
  });

  it("laisse le staff sans coordonnées", () => {
    expect(
      staff.safeParse({ ...input, phone: "", address: "", birthDate: "" })
        .success,
    ).toBe(true);
    expect(staff.safeParse({ ...input, firstName: "" }).success).toBe(false);
  });
});
