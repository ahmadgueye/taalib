"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";

import {
  QuranPlayButton,
  useQuranAudioPlayer,
} from "@/components/public/quran-audio-player";
import { SurahCommand } from "@/components/public/surah-command";
import { TajweedLegend } from "@/components/public/tajweed-legend";
import {
  loadQcfPageFont,
  qcfFontFamily,
  type MushafId,
} from "@/lib/quran/qcf-font";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const FONT_SIZE_STORAGE_KEY = "deenshare:quran-font-size-rem";
const FONT_SIZE_DEFAULT = 2.25;
const FONT_SIZE_MIN = 1.5;
const FONT_SIZE_MAX = 4;
const FONT_SIZE_STEP = 0.25;

// Small localStorage-backed store, factored once since the reader has three
// settings that need identical restore/persist/subscribe behavior.
function createPersistedState<T>(
  key: string,
  defaultValue: T,
  parse: (raw: string) => T | undefined,
) {
  const listeners = new Set<() => void>();
  function subscribe(callback: () => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
  function getSnapshot(): T {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    const parsed = parse(raw);
    return parsed === undefined ? defaultValue : parsed;
  }
  function getServerSnapshot(): T {
    return defaultValue;
  }
  function setStored(next: T) {
    window.localStorage.setItem(key, String(next));
    listeners.forEach((listener) => listener());
  }
  return { subscribe, getSnapshot, getServerSnapshot, setStored };
}

const viewModeStore = createPersistedState<ViewMode>(
  "deenshare:quran-view-mode",
  "arabic-fr",
  (raw) => (raw === "arabic" || raw === "arabic-fr" ? raw : undefined),
);

const tajweedStore = createPersistedState<boolean>(
  "deenshare:quran-tajweed-enabled",
  false,
  (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
);

const fontSizeStore = createPersistedState<number>(
  FONT_SIZE_STORAGE_KEY,
  FONT_SIZE_DEFAULT,
  (raw) => {
    const n = Number(raw);
    return n >= FONT_SIZE_MIN && n <= FONT_SIZE_MAX ? n : undefined;
  },
);

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
  mushafId: MushafId = 1,
): Promise<QuranPage> {
  const res = await fetch(`/api/quran/pages/${pageNumber}?mushaf=${mushafId}`);
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
  mushafId,
  pageNumber,
  singlePageChapter,
}: {
  verses: QuranVerse[];
  fontSizeRem: number;
  mushafId: MushafId;
  pageNumber: number;
  singlePageChapter: boolean;
}) {
  const lines = useMemo(() => groupIntoLines(verses), [verses]);

  // Pages 1 (Al-Fatiha) and 2 (opening of Al-Baqarah) are typeset in the
  // printed Madani mushaf as short, centered, one-ayah-per-line text — not
  // the edge-to-edge justified lines every other page uses. Short surahs
  // that fit entirely on one page (An-Nas, Al-Falaq, etc.) read better the
  // same way, so they get the same treatment.
  const isCenteredPage =
    pageNumber === 1 || pageNumber === 2 || singlePageChapter;

  // Fetch the one (or two, at a page boundary) QCF page font(s) actually
  // used by the words on screen — never the whole 604-font set at once.
  useEffect(() => {
    const pages = new Set<number>();
    for (const words of lines.values()) {
      for (const word of words) pages.add(word.glyphPage);
    }
    pages.forEach((page) => {
      loadQcfPageFont(page, mushafId);
    });
  }, [lines, mushafId]);

  // One shared horizontal scrollbar for the whole page block, not one per
  // line — otherwise every line scrolls independently at larger font sizes
  // and lines drift out of alignment with each other.
  return (
    <div dir="rtl" className="space-y-2 ">
      {Array.from(lines.entries())
        .sort(([a], [b]) => a - b)
        .map(([lineNumber, words]) => (
          <div
            key={lineNumber}
            dir="rtl"
            style={{ fontSize: `${fontSizeRem}rem` }}
            className={`flex flex-nowrap items-baseline gap-x-1 leading-[2.2] ${
              isCenteredPage
                ? "w-full justify-center"
                : `w-max min-w-full ${words.length > 2 ? "justify-between" : "justify-start"}`
            }`}
          >
            {words.map((word, i) => (
              <span
                key={i}
                id={
                  word.isFirstWordOfVerse ? `verse-${word.verseKey}` : undefined
                }
                data-tajweed={mushafId === 19 ? "" : undefined}
                className={word.isFirstWordOfVerse ? "scroll-mt-32" : undefined}
                style={{ fontFamily: qcfFontFamily(word.glyphPage, mushafId) }}
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
  const viewMode = useSyncExternalStore(
    viewModeStore.subscribe,
    viewModeStore.getSnapshot,
    viewModeStore.getServerSnapshot,
  );
  const tajweedEnabled = useSyncExternalStore(
    tajweedStore.subscribe,
    tajweedStore.getSnapshot,
    tajweedStore.getServerSnapshot,
  );
  const mushafId: MushafId = tajweedEnabled ? 19 : 1;
  const fontSizeRem = useSyncExternalStore(
    fontSizeStore.subscribe,
    fontSizeStore.getSnapshot,
    fontSizeStore.getServerSnapshot,
  );
  const [pages, setPages] = useState<QuranPage[]>([]);
  const [loadingNext, setLoadingNext] = useState(false);
  const pendingVerseKey = useRef<string | null>(
    initialVerseNumber > 1 ? `${initialChapterId}:${initialVerseNumber}` : null,
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadTokenRef = useRef(0);
  const isInitialMushafRender = useRef(true);

  const selectedChapter = chaptersById.get(selectedChapterId) ?? chapters[0];
  const hasMultiplePages = selectedChapter.lastPage > selectedChapter.firstPage;
  const previousChapter = chaptersById.get(selectedChapterId - 1);
  const nextChapter = chaptersById.get(selectedChapterId + 1);

  const verseLabels = useMemo(
    () =>
      Object.fromEntries(
        Array.from({ length: selectedChapter.versesCount }, (_, i) => [
          String(i + 1),
          `Verset ${i + 1}`,
        ]),
      ),
    [selectedChapter.versesCount],
  );

  // Load the initial page once on mount. `mushafId` is read once here rather
  // than added to the deps: useSyncExternalStore resolves the restored
  // tajweed preference before mount effects run, so this already reflects
  // the persisted value — it isn't meant to react to later toggles (that's
  // the mushaf-refetch effect below).
  useEffect(() => {
    let cancelled = false;
    fetchPage(initialPage, initialChapterId, mushafId).then((page) => {
      if (!cancelled) setPages([page]);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The tajweed script uses different glyph codes than the plain one, so
  // toggling it requires re-fetching every page already on screen — not just
  // the ones loaded from now on.
  useEffect(() => {
    if (isInitialMushafRender.current) {
      isInitialMushafRender.current = false;
      return;
    }
    const token = ++loadTokenRef.current;
    const pageNumbers = pages.map((p) => p.pageNumber);
    if (pageNumbers.length === 0) return;
    Promise.all(
      pageNumbers.map((n) => fetchPage(n, selectedChapterId, mushafId)),
    ).then((refetched) => {
      if (token !== loadTokenRef.current) return;
      setPages(refetched);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mushafId]);

  function changeFontSize(delta: number) {
    const next = Math.min(
      FONT_SIZE_MAX,
      Math.max(FONT_SIZE_MIN, +(fontSizeRem + delta).toFixed(2)),
    );
    fontSizeStore.setStored(next);
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
      const page = await fetchPage(
        lastLoadedPage + 1,
        selectedChapterId,
        mushafId,
      );
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
  }, [hasMultiplePages, lastLoadedPage, mushafId]);

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
    const page = await fetchPage(pageNumber, chapterId, mushafId);
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

  const audioPlayer = useQuranAudioPlayer({
    chapters,
    selectedChapterId,
  });

  return (
    <div>
      <div className="sticky top-[63px] z-20 -mx-6 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 px-6 py-3">
          <SurahCommand
            chapters={chapters}
            selectedChapter={selectedChapter}
            onSelect={handleChapterSelect}
          />
          <Select
            value={String(selectedVerseNumber)}
            onValueChange={handleVerseSelect}
            items={verseLabels}
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
            <Button
              variant={tajweedEnabled ? "default" : "outline"}
              size="sm"
              aria-pressed={tajweedEnabled}
              disabled={viewMode !== "arabic"}
              title={
                viewMode !== "arabic"
                  ? "Le tajwid n'est disponible qu'en mode Lecture"
                  : undefined
              }
              onClick={() => tajweedStore.setStored(!tajweedEnabled)}
            >
              Tajwid
            </Button>
          </div>
          <Tabs
            value={viewMode}
            onValueChange={(value) =>
              viewModeStore.setStored(value as ViewMode)
            }
          >
            <TabsList>
              <TabsTrigger value="arabic">Lecture</TabsTrigger>
              <TabsTrigger value="arabic-fr">Ayah par ayah</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <TajweedLegend show={tajweedEnabled} />
      </div>

      {audioPlayer.elements}

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
              {showChapterHeading && chapter && (
                <div className="mb-8 space-y-6">
                  <Card className="flex-col justify-center items-center gap-4 bg-muted/50 p-2 text-center sm:flex-row sm:gap-6 sm:text-left">
                    <div
                      aria-hidden="true"
                      translate="no"
                      className="flex px-2 text-center shrink-0 items-center justify-center  font-surah-name text-6xl text-foreground"
                    >
                      {String(chapter.id).padStart(3, "0")}
                    </div>
                    <div className="hidden h-10 w-px bg-border sm:block" />

                    <div className="space-y-1">
                      <h2 className="font-heading text-2xl font-bold">
                        {chapter.id}. Sourate {chapter.nameSimple}
                      </h2>
                      <div className="flex gap-4 items-center">
                        <p className="text-muted-foreground">
                          {chapter.nameTranslated}
                        </p>
                        <QuranPlayButton
                          isPlaying={audioPlayer.isPlaying}
                          audioLoading={audioPlayer.audioLoading}
                          onClick={audioPlayer.handlePlayButtonClick}
                          className="mx-auto sm:mx-0"
                        />
                      </div>
                    </div>
                  </Card>
                  {chapter.hasBismillah && (
                    <p
                      dir="rtl"
                      lang="ar"
                      className="text-center font-calligraphy text-2xl sm:text-3xl"
                    >
                      ﷽
                    </p>
                  )}
                </div>
              )}

              {viewMode === "arabic" ? (
                <MushafLines
                  verses={page.verses}
                  fontSizeRem={fontSizeRem}
                  mushafId={mushafId}
                  pageNumber={page.pageNumber}
                  singlePageChapter={
                    chapter ? chapter.firstPage === chapter.lastPage : false
                  }
                />
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

              <div className="mt-6 border-t pt-4 text-center text-xs tracking-wide text-muted-foreground uppercase">
                Page {page.pageNumber}
              </div>
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
          </>
        )}

        {chapterFullyLoaded && !loadingNext && (
          <div className="pb-12">
            {/* <p className="text-center text-sm text-muted-foreground">
              Fin de la sourate.
            </p> */}
            <div className="mt-4 flex items-stretch justify-between gap-3 ">
              {nextChapter ? (
                <Button
                  variant="outline"
                  className="h-auto flex-1 flex-col items-start gap-0.5 py-2 text-left"
                  onClick={() => handleChapterSelect(nextChapter.id)}
                >
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ChevronLeft className="size-3" />
                    Sourate suivante
                  </span>
                  <span className="truncate font-medium">
                    {nextChapter.id}. {nextChapter.nameSimple}
                  </span>
                </Button>
              ) : (
                <div className="flex-1" />
              )}
              {previousChapter ? (
                <Button
                  variant="outline"
                  className="h-auto flex-1 flex-col items-end gap-0.5 py-2 text-right"
                  onClick={() => handleChapterSelect(previousChapter.id)}
                >
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    Sourate précédente
                    <ChevronRight className="size-3" />
                  </span>
                  <span className="truncate font-medium">
                    {previousChapter.id}. {previousChapter.nameSimple}
                  </span>
                </Button>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
