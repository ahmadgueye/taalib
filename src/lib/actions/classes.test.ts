import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  findStudent: vi.fn(),
  insertValues: vi.fn(),
  inserted: vi.fn(),
  classItems: vi.fn(),
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
        innerJoin: () => ({
          innerJoin: () => ({ where: mocks.classItems }),
        }),
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

import { addClassMember, setRessourceUnlocked } from "@/lib/actions/classes";

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
  mocks.classItems.mockResolvedValue([{ id: "res-1" }]);
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

describe("setRessourceUnlocked", () => {
  it("refuses a ressource outside the class's published cours", async () => {
    mocks.classItems.mockResolvedValue([]);
    expect(
      (await setRessourceUnlocked("class-1", "res-x", true)).error
    ).toBeTruthy();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("unlocks a ressource of a followed cours", async () => {
    expect(await setRessourceUnlocked("class-1", "res-1", true)).toEqual({});
    expect(mocks.insertValues).toHaveBeenCalledWith({
      classId: "class-1",
      ressourceId: "res-1",
    });
  });

  it("locks by deleting the unlock row", async () => {
    expect(await setRessourceUnlocked("class-1", "res-1", false)).toEqual({});
    expect(mocks.deleteWhere).toHaveBeenCalled();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });
});
