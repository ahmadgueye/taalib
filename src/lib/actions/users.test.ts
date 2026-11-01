import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  // Résultat de select().from().where() : le nombre d'admins, ou un objet
  // avec limit() pour la recherche d'un compte par e-mail.
  where: vi.fn(),
  updateSet: vi.fn(),
}));

vi.mock("@/lib/auth/get-session", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mocks.where }) }),
    update: () => ({
      set: (v: unknown) => {
        mocks.updateSet(v);
        return { where: async () => undefined };
      },
    }),
  },
}));

import {
  addTeamMember,
  removeFromTeam,
  updateUserRole,
} from "@/lib/actions/users";

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

  it("does not demote to viewer: removeFromTeam does that", async () => {
    expect(await updateUserRole("u2", "viewer")).toEqual({
      error: "Rôle invalide.",
    });
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it("lets an admin promote another user", async () => {
    await updateUserRole("u2", "contributor");
    expect(mocks.updateSet).toHaveBeenCalledWith({ role: "contributor" });
  });

  it("refuses to demote the last administrator (self)", async () => {
    mocks.where.mockResolvedValue([{ value: 1 }]);
    expect(await updateUserRole("admin-1", "contributor")).toEqual({
      error: "Impossible de retirer le dernier administrateur.",
    });
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it("lets an admin step down when another admin exists", async () => {
    mocks.where.mockResolvedValue([{ value: 2 }]);
    await updateUserRole("admin-1", "contributor");
    expect(mocks.updateSet).toHaveBeenCalledWith({ role: "contributor" });
  });
});

function teamForm(email: string, role = "contributor") {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("role", role);
  return formData;
}

function findsAccount(account?: { id: string; role: string }) {
  mocks.where.mockReturnValue({
    limit: async () => (account ? [account] : []),
  });
}

describe("addTeamMember", () => {
  it("requires an existing account", async () => {
    findsAccount();
    expect(await addTeamMember(undefined, teamForm("new@x.test"))).toEqual({
      error:
        "Aucun compte avec cet e-mail. La personne doit d'abord se connecter une fois sur Taalib.",
    });
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it("refuses someone already in the team", async () => {
    findsAccount({ id: "u2", role: "contributor" });
    expect(await addTeamMember(undefined, teamForm("u2@x.test"))).toEqual({
      error: "Cette personne fait déjà partie de l'équipe.",
    });
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it("gives the chosen role to an existing account", async () => {
    findsAccount({ id: "u2", role: "viewer" });
    expect(
      await addTeamMember(undefined, teamForm("U2@x.test", "admin"))
    ).toEqual({ success: "Ajouté à l'équipe." });
    expect(mocks.updateSet).toHaveBeenCalledWith({ role: "admin" });
  });

  it("rejects a role outside the team", async () => {
    expect(
      await addTeamMember(undefined, teamForm("u2@x.test", "viewer"))
    ).toHaveProperty("error");
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});

describe("removeFromTeam", () => {
  it("turns a member back into a regular account", async () => {
    await removeFromTeam("u2");
    expect(mocks.updateSet).toHaveBeenCalledWith({ role: "viewer" });
  });

  it("refuses to remove yourself", async () => {
    await expect(removeFromTeam("admin-1")).rejects.toThrow();
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});
