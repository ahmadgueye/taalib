import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  getChapters: vi.fn(),
  insertValues: vi.fn(),
  deleteWhere: vi.fn(),
  txInsertValues: vi.fn(),
  txDelete: vi.fn(),
  findFirst: vi.fn(),
  updateSet: vi.fn(),
}));

vi.mock("@/lib/auth/get-session", () => ({
  getCurrentProfile: mocks.getCurrentProfile,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/quran/queries", () => ({ getChapters: mocks.getChapters }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      quranMemorization: { findFirst: mocks.findFirst },
    },
    insert: () => ({
      values: (v: unknown) => {
        mocks.insertValues(v);
        return { onConflictDoUpdate: async () => undefined };
      },
    }),
    update: () => ({
      set: (v: unknown) => {
        mocks.updateSet(v);
        return { where: async () => undefined };
      },
    }),
    delete: () => ({ where: mocks.deleteWhere }),
    transaction: async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        insert: () => ({
          values: (v: unknown) => {
            mocks.txInsertValues(v);
            return { onConflictDoUpdate: async () => undefined };
          },
        }),
        delete: () => ({ where: mocks.txDelete }),
      }),
  },
}));

import {
  confirmVerseReview,
  setChapterMemorizedCount,
  setVerseMemorizationStatus,
} from "@/lib/actions/memorization";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  mocks.getCurrentProfile.mockResolvedValue({ id: "user-1" });
  mocks.getChapters.mockResolvedValue([
    { id: 1, nameSimple: "Al-Fatihah", versesCount: 7 },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("setVerseMemorizationStatus", () => {
  it("requires a signed-in user", async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);
    expect((await setVerseMemorizationStatus(1, 1, "maitrise")).error).toBeTruthy();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it.each([
    [0, 1],
    [115, 1],
    [1, 0],
    [1.5, 1],
  ])("rejects out-of-range verse %s:%s", async (chapter, verse) => {
    expect(
      (await setVerseMemorizationStatus(chapter, verse, "maitrise")).error
    ).toBe("Verset invalide.");
  });

  it("rejects an unknown status", async () => {
    expect(
      (await setVerseMemorizationStatus(1, 1, "hack" as never)).error
    ).toBe("Verset invalide.");
  });

  it("stores the status under the authenticated user with a derived verse key", async () => {
    await setVerseMemorizationStatus(2, 255, "en_cours");
    expect(mocks.insertValues).toHaveBeenCalledWith({
      userId: "user-1",
      chapterId: 2,
      verseNumber: 255,
      verseKey: "2:255",
      status: "en_cours",
      reviewBox: null,
      nextReviewAt: null,
    });
  });

  it("clears the verse when the status is null", async () => {
    await setVerseMemorizationStatus(2, 255, null);
    expect(mocks.deleteWhere).toHaveBeenCalled();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("starts the spaced-repetition schedule at box 1 when marked as mastered", async () => {
    await setVerseMemorizationStatus(2, 255, "maitrise");
    expect(mocks.insertValues).toHaveBeenCalledWith({
      userId: "user-1",
      chapterId: 2,
      verseNumber: 255,
      verseKey: "2:255",
      status: "maitrise",
      reviewBox: 1,
      nextReviewAt: new Date("2026-01-02T00:00:00Z"),
    });
  });
});

describe("setChapterMemorizedCount", () => {
  it("requires a signed-in user", async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);
    expect((await setChapterMemorizedCount(1, 3)).error).toBeTruthy();
  });

  it("rejects a negative or non-integer count", async () => {
    expect((await setChapterMemorizedCount(1, -1)).error).toBe("Valeur invalide.");
    expect((await setChapterMemorizedCount(1, 2.5)).error).toBe("Valeur invalide.");
  });

  it("rejects an unknown chapter", async () => {
    expect((await setChapterMemorizedCount(2, 1)).error).toBe("Sourate inconnue.");
  });

  it("rejects a count above the chapter's verse count", async () => {
    expect((await setChapterMemorizedCount(1, 8)).error).toContain("7 versets");
    expect(mocks.txInsertValues).not.toHaveBeenCalled();
  });

  it("marks verses 1..count as mastered and clears the ones past it", async () => {
    expect(await setChapterMemorizedCount(1, 3)).toEqual({});
    const rows = mocks.txInsertValues.mock.calls[0][0];
    expect(rows.map((r: { verseKey: string }) => r.verseKey)).toEqual([
      "1:1",
      "1:2",
      "1:3",
    ]);
    expect(rows.every((r: { status: string }) => r.status === "maitrise")).toBe(true);
    expect(mocks.txDelete).toHaveBeenCalledTimes(1);
  });

  it("with a count of 0 only clears (full rewind)", async () => {
    await setChapterMemorizedCount(1, 0);
    expect(mocks.txInsertValues).not.toHaveBeenCalled();
    expect(mocks.txDelete).toHaveBeenCalledTimes(1);
  });

  it("gives freshly mastered verses an initial review schedule", async () => {
    await setChapterMemorizedCount(1, 2);
    const rows = mocks.txInsertValues.mock.calls[0][0];
    expect(rows.every((r: { reviewBox: number }) => r.reviewBox === 1)).toBe(
      true
    );
    expect(
      rows.every(
        (r: { nextReviewAt: Date }) =>
          r.nextReviewAt.getTime() === new Date("2026-01-02T00:00:00Z").getTime()
      )
    ).toBe(true);
  });
});

describe("confirmVerseReview", () => {
  it("requires a signed-in user", async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);
    expect((await confirmVerseReview(1, 1, true)).error).toBeTruthy();
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("refuses to review a verse that is neither mastered nor flagged to reinforce", async () => {
    mocks.findFirst.mockResolvedValue({
      status: "en_cours",
      reviewBox: null,
    });
    expect((await confirmVerseReview(1, 1, true)).error).toBe(
      "Ce verset n'est pas en cours de révision."
    );
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it("refuses to review an untracked verse", async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    expect((await confirmVerseReview(1, 1, true)).error).toBeTruthy();
  });

  it("advances the Leitner box and reschedules a mastered verse on success", async () => {
    mocks.findFirst.mockResolvedValue({ status: "maitrise", reviewBox: 2 });
    const result = await confirmVerseReview(1, 1, true);
    expect(result.error).toBeUndefined();
    expect(mocks.updateSet).toHaveBeenCalledWith({
      status: "maitrise",
      reviewBox: 3,
      nextReviewAt: new Date("2026-01-08T00:00:00Z"), // box 3 -> +7 days
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });
  });

  it("demotes a mastered verse to 'à renforcer' and clears the schedule on failure", async () => {
    mocks.findFirst.mockResolvedValue({ status: "maitrise", reviewBox: 4 });
    const result = await confirmVerseReview(1, 1, false);
    expect(result.error).toBeUndefined();
    expect(mocks.updateSet).toHaveBeenCalledWith({
      status: "a_renforcer",
      reviewBox: null,
      nextReviewAt: null,
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });
  });

  it("promotes a verse flagged 'à renforcer' back to mastered, starting at box 1", async () => {
    mocks.findFirst.mockResolvedValue({
      status: "a_renforcer",
      reviewBox: null,
    });
    const result = await confirmVerseReview(1, 1, true);
    expect(result.error).toBeUndefined();
    expect(mocks.updateSet).toHaveBeenCalledWith({
      status: "maitrise",
      reviewBox: 1,
      nextReviewAt: new Date("2026-01-02T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });
  });

  it("keeps a verse flagged 'à renforcer' as-is when still not remembered", async () => {
    mocks.findFirst.mockResolvedValue({
      status: "a_renforcer",
      reviewBox: null,
    });
    const result = await confirmVerseReview(1, 1, false);
    expect(result.error).toBeUndefined();
    expect(mocks.updateSet).toHaveBeenCalledWith({
      status: "a_renforcer",
      reviewBox: null,
      nextReviewAt: null,
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });
  });
});
