import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  adminCount: vi.fn(),
  updateSet: vi.fn(),
}));

vi.mock("@/lib/auth/get-session", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mocks.adminCount }) }),
    update: () => ({
      set: (v: unknown) => {
        mocks.updateSet(v);
        return { where: async () => undefined };
      },
    }),
  },
}));

import { updateUserRole } from "@/lib/actions/users";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin-1", role: "admin" });
});

describe("updateUserRole", () => {
  it("rejects an unknown role", async () => {
    expect(await updateUserRole("u2", "superuser")).toEqual({
      error: "Rôle invalide.",
    });
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it("lets an admin promote another user", async () => {
    await updateUserRole("u2", "contributor");
    expect(mocks.updateSet).toHaveBeenCalledWith({ role: "contributor" });
  });

  it("refuses to demote the last administrator (self)", async () => {
    mocks.adminCount.mockResolvedValue([{ value: 1 }]);
    expect(await updateUserRole("admin-1", "viewer")).toEqual({
      error: "Impossible de retirer le dernier administrateur.",
    });
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it("lets an admin step down when another admin exists", async () => {
    mocks.adminCount.mockResolvedValue([{ value: 2 }]);
    await updateUserRole("admin-1", "viewer");
    expect(mocks.updateSet).toHaveBeenCalledWith({ role: "viewer" });
  });
});
