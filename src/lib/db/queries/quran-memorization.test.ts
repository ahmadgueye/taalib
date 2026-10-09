import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      quranMemorization: { findMany: mocks.findMany },
    },
    select: () => ({
      from: () => ({
        where: () => ({
          groupBy: mocks.groupBy,
        }),
      }),
    }),
  },
}));

import {
  getDueReviews,
  getDueReviewsSummary,
} from "@/lib/db/queries/quran-memorization";

describe("getDueReviews", () => {
  it("returns the rows from the db query as-is", async () => {
    const rows = [{ chapterId: 2, verseNumber: 255, status: "maitrise" }];
    mocks.findMany.mockResolvedValue(rows);

    expect(await getDueReviews("user-1")).toBe(rows);
  });
});

describe("getDueReviewsSummary", () => {
  it("returns all zeros for an anonymous visitor without querying the db", async () => {
    expect(await getDueReviewsSummary(null)).toEqual({
      aRenforcerCount: 0,
      maitriseDueCount: 0,
      total: 0,
    });
    expect(mocks.groupBy).not.toHaveBeenCalled();
  });

  it("sums both buckets into a total", async () => {
    mocks.groupBy.mockResolvedValue([
      { status: "a_renforcer", value: 2 },
      { status: "maitrise", value: 3 },
    ]);

    expect(await getDueReviewsSummary("user-1")).toEqual({
      aRenforcerCount: 2,
      maitriseDueCount: 3,
      total: 5,
    });
  });

  it("defaults a missing bucket to zero rather than throwing", async () => {
    mocks.groupBy.mockResolvedValue([{ status: "a_renforcer", value: 4 }]);

    expect(await getDueReviewsSummary("user-1")).toEqual({
      aRenforcerCount: 4,
      maitriseDueCount: 0,
      total: 4,
    });
  });

  it("returns all zeros when nothing is due", async () => {
    mocks.groupBy.mockResolvedValue([]);

    expect(await getDueReviewsSummary("user-1")).toEqual({
      aRenforcerCount: 0,
      maitriseDueCount: 0,
      total: 0,
    });
  });
});
