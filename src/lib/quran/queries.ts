import { quranFetch } from "@/lib/quran/client";
import type {
  QuranChapter,
  QuranPage,
  QuranReciter,
  QuranVerse,
  VerseTiming,
} from "@/lib/quran/types";

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

type RecitationsResponse = {
  recitations: {
    id: number;
    reciter_name: string;
    style: string | null;
  }[];
};

export async function getRecitations(): Promise<QuranReciter[]> {
  const data = await quranFetch<RecitationsResponse>(
    "/resources/recitations",
    { language: "fr" },
    86400
  );

  return data.recitations.map((r) => ({
    id: r.id,
    name: r.reciter_name,
    style: r.style,
  }));
}

type ChapterAudioResponse = {
  audio_file: { audio_url: string };
};

export async function getChapterAudioUrl(
  recitationId: number,
  chapterId: number
): Promise<string> {
  const data = await quranFetch<ChapterAudioResponse>(
    `/chapter_recitations/${recitationId}/${chapterId}`,
    {},
    86400
  );
  return data.audio_file.audio_url;
}

// CDN base for the per-ayah files returned by /quran/recitations/{id} —
// that endpoint only gives relative paths ("Alafasy/mp3/001001.mp3").
const VERSE_AUDIO_BASE_URL = "https://verses.quran.com/";

type VerseAudioResponse = {
  audio_files: { verse_key: string; url: string }[];
};

// Unlike getChapterAudioUrl (one continuous file per surah, no per-verse
// timing exposed by this API — confirmed empirically, the /chapter_recitations
// endpoint never returns verse timestamps even with fields=timestamps), this
// returns one short pre-trimmed audio file per verse. That's what makes
// looping an arbitrary verse range possible: play the range's files in
// sequence and wrap back to the first on the last one's `ended` event.
export async function getVerseAudioUrls(
  recitationId: number,
  chapterId: number
): Promise<{ verseKey: string; url: string }[]> {
  const data = await quranFetch<VerseAudioResponse>(
    "/quran/recitations/" + recitationId,
    { chapter_number: chapterId },
    86400
  );
  return data.audio_files.map((f) => ({
    verseKey: f.verse_key,
    url: `${VERSE_AUDIO_BASE_URL}${f.url}`,
  }));
}

// api.qurancdn.com is the public QDC API that powers quran.com's own site —
// unlike the official Content API above (quranFetch/client.ts), it needs no
// OAuth and exposes millisecond-accurate verse and word timings for the same
// continuous chapter audio file already used by getChapterAudioUrl, so the
// reader can highlight along during normal playback without switching to
// per-verse file chaining (which would introduce audible gaps between
// verses).
const QDC_AUDIO_BASE_URL = "https://api.qurancdn.com/api/qdc/audio";

type QdcAudioFilesResponse = {
  audio_files: {
    verse_timings: {
      verse_key: string;
      timestamp_from: number;
      timestamp_to: number;
      // Word-position segments as [position, from, to] triplets; the API
      // also emits stray shorter arrays (e.g. `[1]`) interspersed among
      // them that carry no timing and must be filtered out.
      segments: number[][];
    }[];
  }[];
};

export async function getVerseTimings(
  recitationId: number,
  chapterId: number
): Promise<VerseTiming[]> {
  const url = new URL(`${QDC_AUDIO_BASE_URL}/reciters/${recitationId}/audio_files`);
  url.searchParams.set("chapter", String(chapterId));
  url.searchParams.set("segments", "true");

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error("Failed to load verse timings");
  const data = (await res.json()) as QdcAudioFilesResponse;
  const verseTimings = data.audio_files[0]?.verse_timings ?? [];

  return verseTimings.map((v) => ({
    verseKey: v.verse_key,
    timestampFrom: v.timestamp_from,
    timestampTo: v.timestamp_to,
    words: v.segments
      .filter((s): s is [number, number, number] => s.length === 3)
      .map(([position, from, to]) => ({
        position,
        timestampFrom: from,
        timestampTo: to,
      })),
  }));
}
