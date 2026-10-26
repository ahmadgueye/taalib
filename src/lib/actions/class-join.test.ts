import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  getClassByInviteCode: vi.fn(),
  insertValues: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/auth/get-session", () => ({
  getCurrentProfile: mocks.getCurrentProfile,
}));
vi.mock("@/lib/db/queries/classes", () => ({
  getClassByInviteCode: mocks.getClassByInviteCode,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: (v: unknown) => {
        mocks.insertValues(v);
        return { onConflictDoUpdate: mocks.upsert };
      },
    }),
  },
}));

import { joinClass } from "@/lib/actions/class-join";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentProfile.mockResolvedValue({ id: "student-1" });
  mocks.getClassByInviteCode.mockResolvedValue({
    id: "class-1",
    inviteEnabled: true,
  });
});

describe("joinClass", () => {
  it("requires a signed-in user", async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);
    expect((await joinClass("ABCD2345"))?.error).toBeTruthy();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("refuses an unknown code", async () => {
    mocks.getClassByInviteCode.mockResolvedValue(null);
    expect((await joinClass("ABCD2345"))?.error).toBeTruthy();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("refuses a code whose invitations are closed", async () => {
    mocks.getClassByInviteCode.mockResolvedValue({
      id: "class-1",
      inviteEnabled: false,
    });
    expect((await joinClass("ABCD2345"))?.error).toBeTruthy();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("looks the code up normalized and enrolls the signed-in user", async () => {
    expect(await joinClass("abcd-2345")).toEqual({ joined: true });
    expect(mocks.getClassByInviteCode).toHaveBeenCalledWith("ABCD2345");
    expect(mocks.insertValues).toHaveBeenCalledWith({
      classId: "class-1",
      userId: "student-1",
    });
    // Un ancien élève redevient membre actif.
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ set: { leftAt: null } })
    );
  });
});
