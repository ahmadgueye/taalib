"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { SurahCommand } from "@/components/public/surah-command";
import { loadQcfPageFont, qcfFontFamily } from "@/lib/quran/qcf-font";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { QuranChapter, QuranPage, QuranVerse } from "@/lib/quran/types";

type ViewMode = "arabic" | "arabic-fr";

const FONT_SIZE_STORAGE_KEY = "quran-font-size-rem";
const FONT_SIZE_DEFAULT = 2.25;
const FONT_SIZE_MIN = 1.5;
const FONT_SIZE_MAX = 4;
const FONT_SIZE_STEP = 0.25;

// The API's "end" word already carries the correctly formatted Arabic-Indic
// digit(s) for that ayah (e.g. "٢٥٥") — the UthmanicHafs font draws it as the
// traditional verse-end medallion on its own, no extra mark needed.
function splitVerseWords(verse: QuranVerse) {
  const bodyWords = verse.words.filter((w) => !w.isEnd);
  const endWord = verse.words.find((w) => w.isEnd);
  return { bodyWords, endText: endWord?.text ?? "" };
}

// A mushaf page can span the tail of one surah and the head of the next;
// scope it down to the surah currently being read.
function keepChapterVerses(page: QuranPage, chapterId: number): QuranPage {
  return {
    ...page,
    verses: page.verses.filter((v) => v.chapterId === chapterId),
  };
}

async function fetchPage(
  pageNumber: number,
  chapterId: number,
): Promise<QuranPage> {
  const res = await fetch(`/api/quran/pages/${pageNumber}`);
  if (!res.ok) throw new Error("Failed to load page");
  const page = (await res.json()) as QuranPage;
  return keepChapterVerses(page, chapterId);
}

async function fetchVersePage(
  chapterId: number,
  verseNumber: number,
): Promise<number> {
  const res = await fetch(
    `/api/quran/verse-location?chapter=${chapterId}&verse=${verseNumber}`,
  );
  if (!res.ok) throw new Error("Failed to locate verse");
  const data = (await res.json()) as { pageNumber: number };
  return data.pageNumber;
}

type LineWord = {
  verseKey: string;
  isFirstWordOfVerse: boolean;
  isEnd: boolean;
  glyph: string;
  glyphPage: number;
};

// Groups words by the mushaf's actual line_number so each line renders with
// the same fixed set of words no matter the font size, like a real mushaf.
function groupIntoLines(verses: QuranVerse[]): Map<number, LineWord[]> {
  const lines = new Map<number, LineWord[]>();
  for (const verse of verses) {
    verse.words.forEach((word, index) => {
      const line = lines.get(word.lineNumber) ?? [];
      line.push({
        verseKey: verse.verseKey,
        isFirstWordOfVerse: index === 0,
        isEnd: word.isEnd,
        glyph: word.glyph,
        glyphPage: word.glyphPage,
      });
      lines.set(word.lineNumber, line);
    });
  }
  return lines;
}

function MushafLines({
  verses,
  fontSizeRem,
}: {
  verses: QuranVerse[];
  fontSizeRem: number;
}) {
  const lines = useMemo(() => groupIntoLines(verses), [verses]);

  // Fetch the one (or two, at a page boundary) QCF page font(s) actually
  // used by the words on screen — never the whole 604-font set at once.
  useEffect(() => {
    const pages = new Set<number>();
    for (const words of lines.values()) {
      for (const word of words) pages.add(word.glyphPage);
    }
    pages.forEach((page) => {
      loadQcfPageFont(page);
    });
  }, [lines]);

  // One shared horizontal scrollbar for the whole page block, not one per
  // line — otherwise every line scrolls independently at larger font sizes
  // and lines drift out of alignment with each other.
  return (
    <div dir="rtl" className="space-y-2 overflow-x-auto">
      {Array.from(lines.entries())
        .sort(([a], [b]) => a - b)
        .map(([lineNumber, words]) => (
          <div
            key={lineNumber}
            dir="rtl"
            style={{ fontSize: `${fontSizeRem}rem` }}
            className={`flex w-max min-w-full flex-nowrap items-baseline gap-x-1 leading-[2.2] ${
              words.length > 2 ? "justify-between" : "justify-start"
            }`}
          >
            {words.map((word, i) => (
              <span
                key={i}
                id={
                  word.isFirstWordOfVerse ? `verse-${word.verseKey}` : undefined
                }
                className={word.isFirstWordOfVerse ? "scroll-mt-32" : undefined}
                style={{ fontFamily: qcfFontFamily(word.glyphPage) }}
              >
                {word.glyph}
              </span>
            ))}
          </div>
        ))}
    </div>
  );
}

export function QuranReader({
  chapters,
  initialPage,
  initialChapterId,
  initialVerseNumber,
}: {
  chapters: QuranChapter[];
  initialPage: number;
  initialChapterId: number;
  initialVerseNumber: number;
}) {
  const chaptersById = useMemo(
    () => new Map(chapters.map((c) => [c.id, c])),
    [chapters],
  );

  const [selectedChapterId, setSelectedChapterId] = useState(initialChapterId);
  const [selectedVerseNumber, setSelectedVerseNumber] =
    useState(initialVerseNumber);
  const [viewMode, setViewMode] = useState<ViewMode>("arabic-fr");
  const [fontSizeRem, setFontSizeRem] = useState(FONT_SIZE_DEFAULT);
  const [pages, setPages] = useState<QuranPage[]>([]);
  const [loadingNext, setLoadingNext] = useState(false);
  const pendingVerseKey = useRef<string | null>(
    initialVerseNumber > 1 ? `${initialChapterId}:${initialVerseNumber}` : null,
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadTokenRef = useRef(0);

  const selectedChapter = chaptersById.get(selectedChapterId) ?? chapters[0];
  const hasMultiplePages = selectedChapter.lastPage > selectedChapter.firstPage;

  // Load the initial page once on mount.
  useEffect(() => {
    let cancelled = false;
    fetchPage(initialPage, initialChapterId).then((page) => {
      if (!cancelled) setPages([page]);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore the reader's saved font size (client-only, avoids an SSR mismatch).
  useEffect(() => {
    const saved = Number(localStorage.getItem(FONT_SIZE_STORAGE_KEY));
    if (saved >= FONT_SIZE_MIN && saved <= FONT_SIZE_MAX) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of a persisted preference after mount
      setFontSizeRem(saved);
    }
  }, []);

  function changeFontSize(delta: number) {
    setFontSizeRem((prev) => {
      const next = Math.min(
        FONT_SIZE_MAX,
        Math.max(FONT_SIZE_MIN, +(prev + delta).toFixed(2)),
      );
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(next));
      return next;
    });
  }

  // Scroll to the pending verse once its page has rendered.
  useEffect(() => {
    if (!pendingVerseKey.current) return;
    const el = document.getElementById(`verse-${pendingVerseKey.current}`);
    if (el) {
      el.scrollIntoView({ block: "center" });
      pendingVerseKey.current = null;
    }
  }, [pages]);

  const lastLoadedPage = pages.at(-1)?.pageNumber ?? initialPage;
  const chapterFullyLoaded = lastLoadedPage >= selectedChapter.lastPage;

  async function loadNextPage() {
    if (loadingNext || chapterFullyLoaded) return;
    setLoadingNext(true);
    try {
      const page = await fetchPage(lastLoadedPage + 1, selectedChapterId);
      setPages((prev) => [...prev, page]);
    } finally {
      setLoadingNext(false);
    }
  }

  // Only surahs spanning several mushaf pages need continuous scroll.
  useEffect(() => {
    if (!hasMultiplePages) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      { rootMargin: "800px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultiplePages, lastLoadedPage]);

  function updateUrl(chapterId: number, verseNumber: number) {
    const url = new URL(window.location.href);
    url.searchParams.set("sourate", String(chapterId));
    url.searchParams.set("verset", String(verseNumber));
    window.history.replaceState(null, "", url);
  }

  async function goToVerse(chapterId: number, verseNumber: number) {
    const token = ++loadTokenRef.current;
    const pageNumber = await fetchVersePage(chapterId, verseNumber);
    if (token !== loadTokenRef.current) return;

    updateUrl(chapterId, verseNumber);

    const alreadyLoaded = pages.some(
      (p) =>
        p.pageNumber === pageNumber && p.verses[0]?.chapterId === chapterId,
    );
    if (alreadyLoaded) {
      document
        .getElementById(`verse-${chapterId}:${verseNumber}`)
        ?.scrollIntoView({ block: "center" });
      return;
    }

    pendingVerseKey.current = `${chapterId}:${verseNumber}`;
    const page = await fetchPage(pageNumber, chapterId);
    if (token !== loadTokenRef.current) return;
    setPages([page]);
  }

  function handleChapterSelect(chapterId: number) {
    setSelectedChapterId(chapterId);
    setSelectedVerseNumber(1);
    goToVerse(chapterId, 1);
  }

  function handleVerseSelect(verseNumberStr: string | null) {
    if (!verseNumberStr) return;
    const verseNumber = Number(verseNumberStr);
    setSelectedVerseNumber(verseNumber);
    goToVerse(selectedChapterId, verseNumber);
  }

  return (
    <div>
      <div className="sticky top-[65px] z-20 -mx-6 flex flex-wrap items-center gap-2 border-b bg-background/95 px-6 py-3 backdrop-blur-sm sm:top-[73px]">
        <SurahCommand
          chapters={chapters}
          selectedChapter={selectedChapter}
          onSelect={handleChapterSelect}
        />
        <Select
          value={String(selectedVerseNumber)}
          onValueChange={handleVerseSelect}
        >
          <SelectTrigger size="sm" className="w-24">
            <SelectValue placeholder="Verset" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: selectedChapter.versesCount }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                Verset {i + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Diminuer la taille du texte"
            disabled={fontSizeRem <= FONT_SIZE_MIN}
            onClick={() => changeFontSize(-FONT_SIZE_STEP)}
          >
            <Minus />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Augmenter la taille du texte"
            disabled={fontSizeRem >= FONT_SIZE_MAX}
            onClick={() => changeFontSize(FONT_SIZE_STEP)}
          >
            <Plus />
          </Button>
        </div>
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ViewMode)}
        >
          <TabsList>
            <TabsTrigger value="arabic">Arabe</TabsTrigger>
            <TabsTrigger value="arabic-fr">Arabe + FR</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-6">
        {pages.length === 0 && (
          <div className="space-y-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
          </div>
        )}

        {pages.map((page) => {
          const chapter = chaptersById.get(
            page.verses[0]?.chapterId ?? selectedChapterId,
          );
          const showChapterHeading = page.verses[0]?.verseNumber === 1;

          return (
            <div key={page.pageNumber}>
              <p className="mb-6 text-center text-xs tracking-wide text-muted-foreground uppercase">
                Page {page.pageNumber}
              </p>

              {showChapterHeading && chapter && (
                <div className="mb-6 space-y-1 text-center">
                  <h2 dir="rtl" lang="ar" className="font-quran text-3xl">
                    {chapter.nameArabic}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {chapter.id}. {chapter.nameTranslated}
                  </p>
                  {chapter.hasBismillah && (
                    <p dir="rtl" lang="ar" className="pt-2 font-quran text-2xl">
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </p>
                  )}
                </div>
              )}

              {viewMode === "arabic" ? (
                <MushafLines verses={page.verses} fontSizeRem={fontSizeRem} />
              ) : (
                page.verses.map((verse) => {
                  const { bodyWords, endText } = splitVerseWords(verse);
                  return (
                    <div
                      key={verse.verseKey}
                      id={`verse-${verse.verseKey}`}
                      className="mb-5 scroll-mt-32"
                    >
                      <p
                        dir="rtl"
                        lang="ar"
                        style={{ fontSize: `${fontSizeRem}rem` }}
                        className="font-quran text-right leading-loose"
                      >
                        {bodyWords.map((w) => w.text).join(" ")}{" "}
                        <span className="font-quran align-middle">
                          {endText}
                        </span>
                      </p>
                      {verse.translation && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {verse.verseNumber}. {verse.translation}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}

        {hasMultiplePages && (
          <>
            <div ref={sentinelRef} />
            {loadingNext && (
              <div className="space-y-4 pb-8">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
              </div>
            )}
            {chapterFullyLoaded && (
              <p className="pb-12 text-center text-sm text-muted-foreground">
                Fin de la sourate.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
