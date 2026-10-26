import { describe, expect, it, vi } from "vitest";

// Every dashboard Server Action must check the caller's role *before* doing
// anything. These are public POST endpoints: hiding the buttons in the UI is
// not a security boundary. Here the role guards always refuse and the
// database explodes on any use, so an action that forgets its guard fails.
const denied = vi.hoisted(() => () =>
  Promise.reject(new Error("Accès refusé : test"))
);

vi.mock("@/lib/auth/get-session", () => ({
  getCurrentProfile: vi.fn(async () => null),
  requireContributor: denied,
  requireAdmin: denied,
}));

vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get() {
        throw new Error("db touched before authorization");
      },
    }
  ),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

import * as classes from "@/lib/actions/classes";
import * as cours from "@/lib/actions/cours";
import * as hadiths from "@/lib/actions/hadiths";
import * as parcours from "@/lib/actions/parcours";
import * as quiz from "@/lib/actions/quiz";
import * as quizQuestions from "@/lib/actions/quiz-questions";
import * as ressources from "@/lib/actions/ressources";
import * as seances from "@/lib/actions/seances";
import * as thematiques from "@/lib/actions/thematiques";
import * as users from "@/lib/actions/users";

const modules = {
  classes,
  cours,
  hadiths,
  parcours,
  quiz,
  quizQuestions,
  ressources,
  seances,
  thematiques,
  users,
};

describe("dashboard actions require a privileged role", () => {
  for (const [name, mod] of Object.entries(modules)) {
    const actions = Object.entries(mod).filter(
      ([, fn]) => typeof fn === "function"
    ) as [string, (...args: unknown[]) => Promise<unknown>][];

    it(`${name} exports at least one action`, () => {
      expect(actions.length).toBeGreaterThan(0);
    });

    for (const [fnName, fn] of actions) {
      it(`${name}.${fnName} refuses before touching the database`, async () => {
        await expect(
          fn("id", new FormData(), new FormData(), [])
        ).rejects.toThrow("Accès refusé");
      });
    }
  }
});
