import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: mocks.limit }) }),
    }),
  },
}));

import {
  getCurrentProfile,
  requireAdmin,
  requireContributor,
} from "@/lib/auth/get-session";

function signInAs(role: "admin" | "contributor" | "viewer" | null) {
  if (role === null) {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    return;
  }
  mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  mocks.limit.mockResolvedValue([{ id: "u1", role }]);
}

beforeEach(() => vi.clearAllMocks());

describe("getCurrentProfile", () => {
  it("returns null when nobody is signed in", async () => {
    signInAs(null);
    expect(await getCurrentProfile()).toBeNull();
    expect(mocks.limit).not.toHaveBeenCalled();
  });

  it("returns null when the auth user has no profile row", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.limit.mockResolvedValue([]);
    expect(await getCurrentProfile()).toBeNull();
  });
});

describe("requireContributor", () => {
  it.each(["admin", "contributor"] as const)("allows %s", async (role) => {
    signInAs(role);
    await expect(requireContributor()).resolves.toMatchObject({ role });
  });

  it("refuses a viewer", async () => {
    signInAs("viewer");
    await expect(requireContributor()).rejects.toThrow("Accès refusé");
  });

  it("refuses an anonymous visitor", async () => {
    signInAs(null);
    await expect(requireContributor()).rejects.toThrow("Accès refusé");
  });
});

describe("requireAdmin", () => {
  it("allows an admin", async () => {
    signInAs("admin");
    await expect(requireAdmin()).resolves.toMatchObject({ role: "admin" });
  });

  it.each(["contributor", "viewer"] as const)("refuses a %s", async (role) => {
    signInAs(role);
    await expect(requireAdmin()).rejects.toThrow("Accès refusé");
  });

  it("refuses an anonymous visitor", async () => {
    signInAs(null);
    await expect(requireAdmin()).rejects.toThrow("Accès refusé");
  });
});
