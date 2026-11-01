import { describe, expect, it } from "vitest";

import { PAGE_FIRST_VERSES } from "@/lib/quran/page-starts";
import { getVersePageNumber } from "@/lib/quran/verse-page";

describe("getVersePageNumber", () => {
  it("covers the 604 pages of the mushaf, in reading order", () => {
    expect(PAGE_FIRST_VERSES).toHaveLength(604);
    for (let i = 1; i < PAGE_FIRST_VERSES.length; i++) {
      const [pc, pv] = PAGE_FIRST_VERSES[i - 1];
      const [c, v] = PAGE_FIRST_VERSES[i];
      expect(c > pc || (c === pc && v > pv)).toBe(true);
    }
  });

  it("finds the page of a verse, on and between page boundaries", () => {
    expect(getVersePageNumber(1, 1)).toBe(1);
    expect(getVersePageNumber(1, 7)).toBe(1);
    expect(getVersePageNumber(2, 1)).toBe(2);
    expect(getVersePageNumber(2, 5)).toBe(2);
    expect(getVersePageNumber(2, 6)).toBe(3);
    expect(getVersePageNumber(2, 286)).toBe(49);
    expect(getVersePageNumber(18, 1)).toBe(293);
    expect(getVersePageNumber(36, 1)).toBe(440);
    // Ash-Sharh déborde sur la page où commence At-Tin.
    expect(getVersePageNumber(94, 8)).toBe(597);
    expect(getVersePageNumber(114, 6)).toBe(604);
  });
});
