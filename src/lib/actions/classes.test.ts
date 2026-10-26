import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  findStudent: vi.fn(),
  insertValues: vi.fn(),
  inserted: vi.fn(),
  classThematiques: vi.fn(),
  deleteWhere: vi.fn(),
}));

vi.mock("@/lib/auth/get-session", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: mocks.findStudent }),
        innerJoin: () => ({ where: mocks.classThematiques }),
      }),
    }),
    delete: () => ({ where: mocks.deleteWhere }),
    insert: () => ({
      values: (v: unknown) => {
        mocks.insertValues(v);
        return { onConflictDoNothing: () => ({ returning: mocks.inserted }) };
      },
    }),
  },
}));

import { addClassMember, setThematiqueUnlocked } from "@/lib/actions/classes";

function form(email: string) {
  const fd = new FormData();
  fd.set("email", email);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin-1", role: "admin" });
  mocks.findStudent.mockResolvedValue([{ id: "student-1" }]);
  mocks.inserted.mockResolvedValue([{ userId: "student-1" }]);
  mocks.classThematiques.mockResolvedValue([{ id: "them-1" }]);
});

describe("addClassMember", () => {
  it("rejects an invalid e-mail", async () => {
    expect((await addClassMember("class-1", undefined, form("nope")))?.error).toBe(
      "Adresse e-mail invalide."
    );
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("refuses an e-mail with no account", async () => {
    mocks.findStudent.mockResolvedValue([]);
    expect(
      (await addClassMember("class-1", undefined, form("x@y.fr")))?.error
    ).toMatch(/Aucun compte/);
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("reports a student who is already a member", async () => {
    mocks.inserted.mockResolvedValue([]);
    expect(
      (await addClassMember("class-1", undefined, form("x@y.fr")))?.error
    ).toMatch(/déjà/);
  });

  it("adds the matching account to the class", async () => {
    expect(
      await addClassMember("class-1", undefined, form(" X@Y.fr "))
    ).toEqual({ success: "Étudiant ajouté." });
    expect(mocks.insertValues).toHaveBeenCalledWith({
      classId: "class-1",
      userId: "student-1",
    });
  });
});

describe("setThematiqueUnlocked", () => {
  it("refuses a thematique whose cours isn't followed by the class", async () => {
    mocks.classThematiques.mockResolvedValue([]);
    expect(
      (await setThematiqueUnlocked("class-1", "them-x", true)).error
    ).toBeTruthy();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("unlocks a thematique of a followed cours", async () => {
    expect(await setThematiqueUnlocked("class-1", "them-1", true)).toEqual({});
    expect(mocks.insertValues).toHaveBeenCalledWith({
      classId: "class-1",
      thematiqueId: "them-1",
    });
  });

  it("locks by deleting the unlock row", async () => {
    expect(await setThematiqueUnlocked("class-1", "them-1", false)).toEqual({});
    expect(mocks.deleteWhere).toHaveBeenCalled();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });
});
