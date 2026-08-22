import { quranFetch } from "@/lib/quran/client";
import type { QuranChapter, QuranPage, QuranVerse } from "@/lib/quran/types";

export const MUSHAF_TOTAL_PAGES = 604;

const FRENCH_TRANSLATION_RESOURCE_ID = 136;

function stripFootnoteMarkup(text: string): string {
  return text.replace(/<sup[^>]*>.*?<\/sup>/g, "").trim();
}

type ChaptersResponse = {
  chapters: {
    id: number;
    name_simple: string;
    name_arabic: string;
    verses_count: number;
    pages: [number, number];
    bismillah_pre: boolean;
    translated_name: { name: string };
  }[];
};

export async function getChapters(): Promise<QuranChapter[]> {
  const data = await quranFetch<ChaptersResponse>(
    "/chapters",
    { language: "fr" },
    86400
  );

  return data.chapters.map((c) => ({
    id: c.id,
    nameSimple: c.name_simple,
    nameArabic: c.name_arabic,
    nameTranslated: c.translated_name.name,
    versesCount: c.verses_count,
    firstPage: c.pages[0],
    lastPage: c.pages[1],
    hasBismillah: c.bismillah_pre,
  }));
}

type VersesByPageResponse = {
  verses: {
    chapter_id: number;
    verse_number: number;
    verse_key: string;
    page_number: number;
    translations?: { text: string }[];
    words: {
      text_uthmani: string;
      char_type_name: string;
      line_number: number;
      code_v2: string;
      v2_page: number;
    }[];
  }[];
};

export async function getVersesByPage(
  pageNumber: number,
  mushafId: 1 | 19 = 1
): Promise<QuranPage> {
  const data = await quranFetch<VersesByPageResponse>(
    `/verses/by_page/${pageNumber}`,
    {
      fields: "chapter_id",
      words: "true",
      word_fields: "text_uthmani,char_type_name,code_v2,v2_page",
      translations: FRENCH_TRANSLATION_RESOURCE_ID,
      per_page: 50,
      mushaf: mushafId,
    },
    3600
  );

  const verses: QuranVerse[] = data.verses.map((v) => ({
    chapterId: v.chapter_id,
    verseNumber: v.verse_number,
    verseKey: v.verse_key,
    words: v.words.map((w) => ({
      text: w.text_uthmani,
      lineNumber: w.line_number,
      isEnd: w.char_type_name === "end",
      glyph: w.code_v2,
      glyphPage: w.v2_page,
    })),
    pageNumber: v.page_number,
    translation: v.translations?.[0]
      ? stripFootnoteMarkup(v.translations[0].text)
      : null,
  }));

  return { pageNumber, verses };
}

type VerseByKeyResponse = {
  verse: { page_number: number };
};

export async function getVersePage(
  chapterId: number,
  verseNumber: number
): Promise<number> {
  const data = await quranFetch<VerseByKeyResponse>(
    `/verses/by_key/${chapterId}:${verseNumber}`,
    { fields: "page_number" },
    86400
  );
  return data.verse.page_number;
}
