import { describe, expect, it } from "vitest";

import {
  MAX_REVIEW_BOX,
  REVIEW_INTERVALS_DAYS,
  scheduleNextReview,
} from "@/lib/quran/memorization";

describe("scheduleNextReview", () => {
  const from = new Date("2026-01-01T00:00:00Z");

  it("starts at box 1 when there was no previous box", () => {
    expect(scheduleNextReview(null, from)).toEqual({
      box: 1,
      nextReviewAt: new Date("2026-01-02T00:00:00Z"),
    });
  });

  it("advances one box per success and schedules further out each time", () => {
    expect(scheduleNextReview(1, from).box).toBe(2);
    expect(scheduleNextReview(2, from).box).toBe(3);
    expect(scheduleNextReview(3, from).box).toBe(4);
    expect(scheduleNextReview(4, from).box).toBe(5);
  });

  it("caps the box at the longest interval instead of growing forever", () => {
    expect(scheduleNextReview(MAX_REVIEW_BOX, from).box).toBe(MAX_REVIEW_BOX);
    expect(scheduleNextReview(MAX_REVIEW_BOX + 10, from).box).toBe(
      MAX_REVIEW_BOX
    );
  });

  it("schedules the next review using the interval matching the new box", () => {
    REVIEW_INTERVALS_DAYS.forEach((days, index) => {
      const previousBox = index === 0 ? null : index;
      const { nextReviewAt } = scheduleNextReview(previousBox, from);
      const expected = new Date(from);
      expected.setDate(expected.getDate() + days);
      expect(nextReviewAt).toEqual(expected);
    });
  });
});
