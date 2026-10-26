import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  getStudentAccess: vi.fn(),
}));

vi.mock("@/lib/auth/get-session", () => ({
  getCurrentProfile: mocks.getCurrentProfile,
}));
vi.mock("@/lib/db/queries/content-access", () => ({
  getStudentAccess: mocks.getStudentAccess,
}));

import { getContentAccess } from "@/lib/auth/content-access";
import { noAccess } from "@/lib/content-access";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getStudentAccess.mockResolvedValue({ all: false, student: true });
});

describe("getContentAccess", () => {
  it("gives a visitor no access", async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);
    expect(await getContentAccess()).toBe(noAccess);
    expect(mocks.getStudentAccess).not.toHaveBeenCalled();
  });

  it.each(["admin", "contributor"])("gives %s full access", async (role) => {
    mocks.getCurrentProfile.mockResolvedValue({ id: "u1", role });
    expect(await getContentAccess()).toEqual({ all: true });
    expect(mocks.getStudentAccess).not.toHaveBeenCalled();
  });

  it("computes a viewer's access from their classes", async () => {
    mocks.getCurrentProfile.mockResolvedValue({ id: "student-1", role: "viewer" });
    expect(await getContentAccess()).toEqual({ all: false, student: true });
    expect(mocks.getStudentAccess).toHaveBeenCalledWith("student-1");
  });
});
