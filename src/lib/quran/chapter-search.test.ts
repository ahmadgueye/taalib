import { describe, expect, it } from "vitest";

import { filterChapters } from "@/lib/quran/chapter-search";
import type { QuranChapter } from "@/lib/quran/types";

const chapter = (
  id: number,
  nameSimple: string,
  nameTranslated: string,
  nameArabic: string
): QuranChapter => ({
  id,
  nameSimple,
  nameTranslated,
  nameArabic,
  versesCount: 1,
  firstPage: 1,
  lastPage: 1,
  hasBismillah: true,
});

const chapters = [
  chapter(2, "Al-Baqarah", "La vache", "البقرة"),
  chapter(11, "Hud", "Hûd", "هود"),
  chapter(112, "Al-Ikhlas", "Le monothéisme pur", "الإخلاص"),
];

const ids = (query: string) => filterChapters(chapters, query).map((c) => c.id);

describe("filterChapters", () => {
  it("returns every chapter for an empty query", () => {
    expect(ids("  ")).toEqual([2, 11, 112]);
  });

  it("matches numbers as a prefix", () => {
    expect(ids("11")).toEqual([11, 112]);
    expect(ids("2")).toEqual([2]);
  });

  it("ignores case, accents, spaces and hyphens", () => {
    expect(ids("al baqara")).toEqual([2]);
    expect(ids("hud")).toEqual([11]);
    expect(ids("MONOTHEISME")).toEqual([112]);
  });

  it("matches Arabic names, with or without tashkeel", () => {
    expect(ids("البقرة")).toEqual([2]);
    expect(ids("هُود")).toEqual([11]);
  });
});
