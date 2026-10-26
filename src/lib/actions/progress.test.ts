import { beforeEach, describe, expect, it, vi } from "vitest";

const RES = "55555555-5555-4555-8555-555555555555";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  findFirst: vi.fn(),
  insertValues: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/get-session", () => ({
  getCurrentProfile: mocks.getCurrentProfile,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/db", () => ({
  db: {
    query: { ressources: { findFirst: mocks.findFirst } },
    insert: () => ({
      values: (v: unknown) => {
        mocks.insertValues(v);
        return { onConflictDoNothing: async () => undefined };
      },
    }),
  },
}));

import { markRessourceCompleted } from "@/lib/actions/progress";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentProfile.mockResolvedValue({ id: "user-1" });
  mocks.findFirst.mockResolvedValue({ id: RES });
});

describe("markRessourceCompleted", () => {
  it("requires a signed-in user", async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);
    const res = await markRessourceCompleted(RES, "/x");
    expect(res.error).toBeTruthy();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("rejects an invalid id or a non-absolute path", async () => {
    expect((await markRessourceCompleted("nope", "/x")).error).toBeTruthy();
    expect((await markRessourceCompleted(RES, "https://evil")).error).toBeTruthy();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("refuses a resource that isn't published (draft or unknown)", async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    expect(await markRessourceCompleted(RES, "/x")).toEqual({
      error: "Ressource introuvable.",
    });
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("records completion for the authenticated user and revalidates the page", async () => {
    expect(await markRessourceCompleted(RES, "/thematiques/t")).toEqual({});
    expect(mocks.insertValues).toHaveBeenCalledWith({
      userId: "user-1",
      ressourceId: RES,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/thematiques/t");
  });
});
