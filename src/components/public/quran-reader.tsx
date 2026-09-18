"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { Dialog as ZenDialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { MemorizationProgressBar } from "@/components/public/memorization-progress-bar";
import {
  QuranPlayButton,
  useQuranAudioPlayer,
} from "@/components/public/quran-audio-player";
import { SurahCommand } from "@/components/public/surah-command";
import { TajweedLegend } from "@/components/public/tajweed-legend";
import { setVerseMemorizationStatus } from "@/lib/actions/memorization";
import type { MemorizationStatus } from "@/lib/db/schema";
import {
  MEMORIZATION_CYCLE,
  MEMORIZATION_STYLES,
  memorizationStatusLabel,
  nextMemorizationStatus,
} from "@/lib/quran/memorization";
import {
  isQcfPageFontReady,
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
import { cn } from "@/lib/utils";
import type { QuranChapter, QuranPage, QuranVerse } from "@/lib/quran/types";

type ViewMode = "arabic" | "arabic-fr";

const FONT_SIZE_STORAGE_KEY = "deenshare:quran-font-size-rem";
const FONT_SIZE_DEFAULT = 2.25;
// Lower than desktop really needs, but mobile screens are narrow enough
// that 1.5rem could still force a page's widest mushaf lines wider than the
// viewport — going smaller gives those users the same "always fits" option.
const FONT_SIZE_MIN = 1;
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

const zenModeStore = createPersistedState<boolean>(
  "deenshare:quran-zen-mode",
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

const LAST_POSITION_STORAGE_KEY = "deenshare:quran-last-position";

type LastPosition = { chapterId: number; verseNumber: number };

function readLastPosition(): LastPosition | null {
  const raw = window.localStorage.getItem(LAST_POSITION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LastPosition>;
    return typeof parsed.chapterId === "number" &&
      typeof parsed.verseNumber === "number"
      ? { chapterId: parsed.chapterId, verseNumber: parsed.verseNumber }
      : null;
  } catch {
    return null;
  }
}

function writeLastPosition(position: LastPosition) {
  window.localStorage.setItem(
    LAST_POSITION_STORAGE_KEY,
    JSON.stringify(position),
  );
}

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

// A zero-size virtual anchor at the click point, so the right-click status
// menu opens exactly where the pointer landed instead of against a real DOM
// element (there's no single element that represents "this verse" to anchor
// to across both the per-word mushaf view and the per-verse text view).
function pointAnchor(x: number, y: number) {
  return {
    getBoundingClientRect: () =>
      ({
        x,
        y,
        top: y,
        left: x,
        right: x,
        bottom: y,
        width: 0,
        height: 0,
        toJSON() {},
      }) satisfies DOMRect,
  };
}

type LineWord = {
  verseKey: string;
  isFirstWordOfVerse: boolean;
  isEnd: boolean;
  glyph: string;
  glyphPage: number;
  // 1-indexed position among the verse's body words (null for the
  // end-of-ayah marker, which the audio timings API never assigns a
  // position to) — lets a word be matched against activeWordPosition.
  bodyPosition: number | null;
};

// Groups words by the mushaf's actual line_number so each line renders with
// the same fixed set of words no matter the font size, like a real mushaf.
function groupIntoLines(verses: QuranVerse[]): Map<number, LineWord[]> {
  const lines = new Map<number, LineWord[]>();
  for (const verse of verses) {
    let bodyPosition = 0;
    verse.words.forEach((word, index) => {
      const line = lines.get(word.lineNumber) ?? [];
      line.push({
        verseKey: verse.verseKey,
        isFirstWordOfVerse: index === 0,
        isEnd: word.isEnd,
        glyph: word.glyph,
        glyphPage: word.glyphPage,
        bodyPosition: word.isEnd ? null : ++bodyPosition,
      });
      lines.set(word.lineNumber, line);
    });
  }
  return lines;
}

// Stable identity across re-renders as long as the words on screen haven't
// actually changed — safe to use as an effect dependency below.
function useNeededGlyphPages(lines: Map<number, LineWord[]>): number[] {
  return useMemo(() => {
    const pages = new Set<number>();
    for (const words of lines.values()) {
      for (const word of words) pages.add(word.glyphPage);
    }
    return Array.from(pages).sort((a, b) => a - b);
  }, [lines]);
}

// Triggers loadQcfPageFont for every page currently needed and reports once
// all of them have actually finished loading — not just "requested", since
// loadQcfPageFont's cache can be shared with an earlier still-in-flight
// caller. isQcfPageFontReady covers the "already loaded from an earlier
// visit" case synchronously, avoiding a one-tick flash on revisits.
function useQcfFontsReady(pages: number[], mushafId: MushafId): boolean {
  const [readyKeys, setReadyKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    let cancelled = false;
    pages.forEach((page) => {
      const key = `${mushafId}:${page}`;
      loadQcfPageFont(page, mushafId).then(() => {
        if (cancelled) return;
        setReadyKeys((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pages, mushafId]);

  return pages.every(
    (page) =>
      readyKeys.has(`${mushafId}:${page}`) ||
      isQcfPageFontReady(page, mushafId),
  );
}

function MushafLines({
  verses,
  fontSizeRem,
  mushafId,
  pageNumber,
  singlePageChapter,
  statusMap,
  onVerseTap,
  onVerseContextMenu,
  activeVerseKey,
  activeWordPosition,
}: {
  verses: QuranVerse[];
  fontSizeRem: number;
  mushafId: MushafId;
  pageNumber: number;
  singlePageChapter: boolean;
  statusMap: Record<string, MemorizationStatus>;
  onVerseTap: (verseKey: string) => void;
  onVerseContextMenu: (event: React.MouseEvent, verseKey: string) => void;
  activeVerseKey: string | null;
  activeWordPosition: number | null;
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
  const neededPages = useNeededGlyphPages(lines);
  const fontsReady = useQcfFontsReady(neededPages, mushafId);

  // The outer wrapper sizes itself to the page's own widest line (w-max),
  // capped by the reader column (max-w-full) — every other line then
  // stretches to fill that same, content-derived width via w-full below.
  // Justifying against a width taken from the page's own content (instead
  // of the reader column's fixed width, which is unrelated to font size)
  // keeps the amount of stretch proportional at every zoom level: a page
  // whose lines are naturally short no longer gets force-stretched to an
  // arbitrarily wider column just because the column has room to spare.
  return (
    <div dir="rtl" className="mx-auto w-max max-w-full space-y-2">
      {Array.from(lines.entries())
        .sort(([a], [b]) => a - b)
        .map(([lineNumber, words]) => (
          <div key={lineNumber} className="relative">
            {!fontsReady && <Skeleton className="absolute inset-0" />}
            <div
              dir="rtl"
              style={{
                fontSize: `${fontSizeRem}rem`,
                visibility: fontsReady ? "visible" : "hidden",
                // em, not a fixed rem/px gap: relative to this element's own
                // font-size, so the space between words scales together with
                // the glyphs at every zoom level instead of staying fixed
                // while only the letters grow or shrink.
                columnGap: "0.125em",
              }}
              className={`flex w-full flex-nowrap items-baseline leading-[2.2] ${
                isCenteredPage
                  ? "justify-center"
                  : words.length > 2
                    ? "justify-between"
                    : "justify-start"
              }`}
            >
              {words.map((word, i) => {
                const status = statusMap[word.verseKey];
                const isActiveWord =
                  word.verseKey === activeVerseKey &&
                  word.bodyPosition !== null &&
                  word.bodyPosition === activeWordPosition;
                return (
                  <span
                    key={i}
                    id={
                      word.isFirstWordOfVerse
                        ? `verse-${word.verseKey}`
                        : undefined
                    }
                    data-tajweed={mushafId === 19 ? "" : undefined}
                    className={cn(
                      "cursor-pointer rounded-sm transition-colors",
                      word.isFirstWordOfVerse && "scroll-mt-32",
                      status && MEMORIZATION_STYLES[status].tint,
                      isActiveWord && "bg-primary/30",
                    )}
                    style={{
                      fontFamily: qcfFontFamily(word.glyphPage, mushafId),
                    }}
                    onClick={() => {
                      // Skip the tap if this click is the tail end of a
                      // text selection/drag, not an actual tap.
                      if (window.getSelection()?.toString()) return;
                      onVerseTap(word.verseKey);
                    }}
                    onContextMenu={(e) => onVerseContextMenu(e, word.verseKey)}
                  >
                    {word.glyph}
                  </span>
                );
              })}
            </div>
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
  initialMemorizationStatus,
  isAuthenticated,
  hasExplicitPosition,
}: {
  chapters: QuranChapter[];
  initialPage: number;
  initialChapterId: number;
  initialVerseNumber: number;
  initialMemorizationStatus: Record<string, MemorizationStatus>;
  isAuthenticated: boolean;
  hasExplicitPosition: boolean;
}) {
  const chaptersById = useMemo(
    () => new Map(chapters.map((c) => [c.id, c])),
    [chapters],
  );

  const [statusMap, setStatusMap] = useState(initialMemorizationStatus);
  const [, startStatusTransition] = useTransition();
  // The right-click status menu: which verse it's for and where it opened,
  // null when closed. A single shared instance rather than one per verse,
  // since only one can be open at a time and most verses never open one.
  const [statusMenu, setStatusMenu] = useState<{
    verseKey: string;
    x: number;
    y: number;
  } | null>(null);
  // Distraction-free reading: hides every control and just shows the text
  // full-screen. Persisted like the other reader settings, so reloading
  // mid-session doesn't drop back into the full chrome.
  const zenMode = useSyncExternalStore(
    zenModeStore.subscribe,
    zenModeStore.getSnapshot,
    zenModeStore.getServerSnapshot,
  );

  // Sets a verse's memorization status directly. Updates the UI immediately
  // (must feel instant) and rolls back only if the server action reports an
  // error — no loading state, no revalidation round-trip. Shared by
  // tap-to-cycle and the right-click status menu.
  function applyVerseStatus(verseKey: string, next: MemorizationStatus | null) {
    const previous = statusMap[verseKey] ?? null;
    if (next === previous) return;

    setStatusMap((prev) => {
      const draft = { ...prev };
      if (next === null) delete draft[verseKey];
      else draft[verseKey] = next;
      return draft;
    });
    // Fixed id: repeated taps replace this toast in place instead of
    // stacking a new one each time, which would bury the current status
    // under a pile of past ones.
    toast(`Verset marqué : ${memorizationStatusLabel(next)}`, {
      id: "memorization-status",
    });

    startStatusTransition(async () => {
      const [chapterId, verseNumber] = verseKey.split(":").map(Number);
      const result = await setVerseMemorizationStatus(
        chapterId,
        verseNumber,
        next,
      );
      if (result.error) {
        setStatusMap((prev) => {
          const draft = { ...prev };
          if (previous === null) delete draft[verseKey];
          else draft[verseKey] = previous;
          return draft;
        });
        toast.error(result.error);
      }
    });
  }

  function handleVerseTap(verseKey: string) {
    if (!isAuthenticated) {
      toast.error("Connecte-toi pour suivre ta mémorisation.");
      return;
    }
    applyVerseStatus(
      verseKey,
      nextMemorizationStatus(statusMap[verseKey] ?? null),
    );
  }

  // Right-click (or long-press-equivalent context menu) opens a picker with
  // every status directly selectable, so fixing a misclick or jumping
  // straight to "Maîtrisé" doesn't require cycling through the others first.
  function handleVerseContextMenu(event: React.MouseEvent, verseKey: string) {
    event.preventDefault();
    if (!isAuthenticated) {
      toast.error("Connecte-toi pour suivre ta mémorisation.");
      return;
    }
    setStatusMenu({ verseKey, x: event.clientX, y: event.clientY });
  }

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
  const [visiblePageNumber, setVisiblePageNumber] = useState<number | null>(
    null,
  );
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pendingVerseKey = useRef<string | null>(
    initialVerseNumber > 1 ? `${initialChapterId}:${initialVerseNumber}` : null,
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadTokenRef = useRef(0);
  const lastMushafIdRef = useRef(mushafId);

  const selectedChapter = chaptersById.get(selectedChapterId) ?? chapters[0];
  const hasMultiplePages = selectedChapter.lastPage > selectedChapter.firstPage;
  const previousChapter = chaptersById.get(selectedChapterId - 1);
  const nextChapter = chaptersById.get(selectedChapterId + 1);

  // Defends against a stale/superseded fetch (see loadNextPage's token
  // guard below) ever being shown, and gives every derived value below a
  // single, trustworthy, page-number-ordered source of truth instead of
  // each re-deriving from raw fetch-resolution order.
  const currentChapterPages = useMemo(
    () =>
      pages
        .filter(
          (p) =>
            p.verses.length > 0 && p.verses[0].chapterId === selectedChapterId,
        )
        .sort((a, b) => a.pageNumber - b.pageNumber),
    [pages, selectedChapterId],
  );

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
    // No sourate/verset in the URL: silently resume the last position read
    // on this device instead of always landing back on Al-Fatiha.
    const saved = hasExplicitPosition ? null : readLastPosition();
    if (
      saved &&
      (saved.chapterId !== initialChapterId ||
        saved.verseNumber !== initialVerseNumber)
    ) {
      loadPagesUpTo(saved.chapterId, saved.verseNumber);
      return;
    }

    let cancelled = false;
    const token = loadTokenRef.current;
    fetchPage(initialPage, initialChapterId, mushafId).then((page) => {
      if (!cancelled && token === loadTokenRef.current) setPages([page]);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scrollspy for reading progress: infinite scroll prefetches the next
  // page ~800px before it's actually seen, so "the last page that landed"
  // (used by an earlier version of this effect) runs ahead of what the
  // user has really read. Tracking which page currently occupies the top
  // reading band of the viewport instead ties the saved position to what's
  // on screen, not what's been fetched in the background.
  useEffect(() => {
    const intersecting = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNumber = Number(
            (entry.target as HTMLElement).dataset.pageNumber,
          );
          if (Number.isNaN(pageNumber)) continue;
          if (entry.isIntersecting) intersecting.add(pageNumber);
          else intersecting.delete(pageNumber);
        }
        // Several loaded pages can overlap the band at once when they're
        // short; the furthest one along is the one actually being read,
        // since pages within a chapter are always read in increasing order.
        if (intersecting.size > 0) {
          setVisiblePageNumber(Math.max(...intersecting));
        }
      },
      // Only the top 40% of the viewport counts as "currently reading" —
      // matches the classic scrollspy trick, and stays forgiving for short
      // pages that don't reach halfway down the screen.
      { rootMargin: "0px 0px -60% 0px", threshold: 0 },
    );
    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [currentChapterPages]);

  // Persists whatever the scrollspy above currently considers "on screen".
  useEffect(() => {
    if (visiblePageNumber == null) return;
    const page = currentChapterPages.find(
      (p) => p.pageNumber === visiblePageNumber,
    );
    const firstVerse = page?.verses[0];
    if (!firstVerse) return;
    writeLastPosition({
      chapterId: selectedChapterId,
      verseNumber: firstVerse.verseNumber,
    });
  }, [visiblePageNumber, currentChapterPages, selectedChapterId]);

  // The tajweed script uses different glyph codes than the plain one, so
  // toggling it requires re-fetching every page already on screen — not just
  // the ones loaded from now on. Compares against the last-seen mushafId
  // (rather than a "have I run once yet" boolean) so the skip-on-mount check
  // stays correct under StrictMode's mount→cleanup→mount dev replay: a
  // boolean flipped inside the effect body survives that replay and no
  // longer blocks the second (real) invocation, which would otherwise bump
  // loadTokenRef before the mount-effect's own fetch above resolves and
  // silently discard it.
  useEffect(() => {
    if (lastMushafIdRef.current === mushafId) return;
    lastMushafIdRef.current = mushafId;
    const token = ++loadTokenRef.current;
    const pageNumbers = currentChapterPages.map((p) => p.pageNumber);
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

  // currentChapterPages is empty on every chapter switch until the new
  // chapter's first page lands, so the fallback below can't reuse the
  // frozen initialPage prop (that would miscompute against the very first
  // chapter ever loaded, not the one just selected) — it falls back to the
  // new chapter's first page instead, which is always where goToVerse is
  // headed for a chapter switch.
  const lastLoadedPage =
    currentChapterPages.at(-1)?.pageNumber ??
    (pages.length === 0 ? initialPage : selectedChapter.firstPage);
  const chapterFullyLoaded = lastLoadedPage >= selectedChapter.lastPage;

  async function loadNextPage() {
    if (loadingNext || chapterFullyLoaded) return;
    const token = loadTokenRef.current;
    setLoadingNext(true);
    try {
      const page = await fetchPage(
        lastLoadedPage + 1,
        selectedChapterId,
        mushafId,
      );
      if (token !== loadTokenRef.current) return;
      setPages((prev) =>
        prev.some((p) => p.pageNumber === page.pageNumber)
          ? prev
          : [...prev, page],
      );
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
  }, [
    hasMultiplePages,
    lastLoadedPage,
    selectedChapterId,
    chapterFullyLoaded,
    mushafId,
  ]);

  // Restores every page from the chapter's start up to the saved one, so
  // resuming mid-chapter doesn't drop the reader onto an isolated page with
  // no scroll-back context — unlike goToVerse's single-page jump, which is
  // fine for an explicit search but would make a resumed chapter look cut
  // off at the top.
  async function loadPagesUpTo(chapterId: number, verseNumber: number) {
    const chapter = chaptersById.get(chapterId);
    if (!chapter) return;
    const token = ++loadTokenRef.current;
    const targetPage = await fetchVersePage(chapterId, verseNumber);
    if (token !== loadTokenRef.current) return;

    updateUrl(chapterId, verseNumber);
    pendingVerseKey.current = `${chapterId}:${verseNumber}`;

    const pageNumbers = Array.from(
      { length: targetPage - chapter.firstPage + 1 },
      (_, i) => chapter.firstPage + i,
    );
    const fetchedPages = await Promise.all(
      pageNumbers.map((p) => fetchPage(p, chapterId, mushafId)),
    );
    if (token !== loadTokenRef.current) return;
    // Set together in one commit: selectedChapterId must never be visible
    // with a `pages` array from a different chapter, or the infinite-scroll
    // effect below computes lastLoadedPage/chapterFullyLoaded from that
    // mismatched pairing and can fetch (and duplicate) a page that's
    // already part of fetchedPages.
    setSelectedChapterId(chapterId);
    setSelectedVerseNumber(verseNumber);
    setPages(fetchedPages);
  }

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

  // Shared between the normal layout and the Zen overlay below — rendered
  // in exactly one of the two at a time (never both), since MushafLines
  // assigns each verse's first word a DOM id that must stay unique.
  const readingContent = (
    <div
      className={cn(
        viewMode === "arabic" &&
          "w-screen -ml-[calc(50vw-50%)] -mr-[calc(50vw-50%)]",
      )}
    >
      <div
        className={cn(
          "mx-auto mt-8 space-y-6",
          viewMode === "arabic" ? "max-w-7xl px-6" : "max-w-3xl",
        )}
      >
        {currentChapterPages.length === 0 && (
          <div className="space-y-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
          </div>
        )}

        {currentChapterPages.map((page) => {
          const chapter = chaptersById.get(
            page.verses[0]?.chapterId ?? selectedChapterId,
          );
          const showChapterHeading = page.verses[0]?.verseNumber === 1;

          return (
            <div
              key={page.pageNumber}
              data-page-number={page.pageNumber}
              ref={(el) => {
                if (el) pageRefs.current.set(page.pageNumber, el);
                else pageRefs.current.delete(page.pageNumber);
              }}
            >
              {showChapterHeading && chapter && (
                <div className="mx-auto mb-8 max-w-3xl space-y-6">
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
                  statusMap={statusMap}
                  onVerseTap={handleVerseTap}
                  onVerseContextMenu={handleVerseContextMenu}
                  activeVerseKey={audioPlayer.activeVerseKey}
                  activeWordPosition={audioPlayer.activeWordPosition}
                />
              ) : (
                page.verses.map((verse) => {
                  const { bodyWords, endText } = splitVerseWords(verse);
                  const status = statusMap[verse.verseKey];
                  const isActiveVerse =
                    verse.verseKey === audioPlayer.activeVerseKey;
                  return (
                    <div
                      key={verse.verseKey}
                      id={`verse-${verse.verseKey}`}
                      className={cn(
                        "-mx-2 mb-5 scroll-mt-32 cursor-pointer rounded-md px-2 py-1 transition-colors",
                        status && MEMORIZATION_STYLES[status].tint,
                        isActiveVerse && "ring-1 ring-primary/50",
                      )}
                      onClick={() => {
                        if (window.getSelection()?.toString()) return;
                        handleVerseTap(verse.verseKey);
                      }}
                      onContextMenu={(e) =>
                        handleVerseContextMenu(e, verse.verseKey)
                      }
                    >
                      <p
                        dir="rtl"
                        lang="ar"
                        style={{ fontSize: `${fontSizeRem}rem` }}
                        className="font-quran text-right leading-loose"
                      >
                        {bodyWords.map((w, i) => (
                          <span
                            key={i}
                            className={cn(
                              "rounded-sm transition-colors",
                              isActiveVerse &&
                                i + 1 === audioPlayer.activeWordPosition &&
                                "bg-primary/30",
                            )}
                          >
                            {w.text}{" "}
                          </span>
                        ))}
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

  // Shared between the normal toolbar and the Zen overlay's minimal top
  // bar — the only two controls kept available in Zen mode.
  const chapterVerseSelector = (
    <>
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
    </>
  );

  const fontSizeControls = (
    <>
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
    </>
  );

  return (
    <div>
      {!zenMode && (
      <div className="sticky top-[63px] z-20 -mx-6 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 px-6 py-3">
          {chapterVerseSelector}
          <div className="ml-auto flex items-center gap-1">
            {fontSizeControls}
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
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Activer le mode Zen"
              onClick={() => zenModeStore.setStored(true)}
            >
              <Maximize2 />
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
        {isAuthenticated && (
          <MemorizationProgressBar
            chapterId={selectedChapterId}
            statusMap={statusMap}
            totalVerses={selectedChapter.versesCount}
          />
        )}
      </div>
      )}

      {audioPlayer.elements}

      {/*
        The mushaf view's lines are typeset (via the per-page QCF font) to
        all come out the same width at a given font size, with no wrapping —
        at very large font sizes a page's widest lines need more room than
        even the site's shared page layout allows (`main` is capped at
        max-w-5xl). Horizontal scroll to compensate was tried before and
        hurt the reading experience, so instead this mode breaks out of that
        shared max-width — but only itself, not the sticky toolbar above or
        any other page on the site.

        Full-bleed and a max-width cap can't both live on the same element:
        `width: 100vw` combined with `max-width` makes max-width win once
        the viewport exceeds it, and the outer margin trick that centers a
        100vw box on the viewport no longer centers a box that's actually
        narrower than that — it was computed assuming the box really is
        100vw wide. So the breakout (outer div, always exactly 100vw, no
        cap) and the width cap (inner div, max-w-7xl mx-auto) are split
        across two nested elements instead.
      */}
      {!zenMode && readingContent}

      <ZenDialog.Root
        open={zenMode}
        onOpenChange={(open) => zenModeStore.setStored(open)}
      >
        <ZenDialog.Portal>
          <ZenDialog.Popup
            className={cn(
              "fixed inset-0 z-50 overflow-y-auto bg-background outline-none",
              "duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
            )}
          >
            {zenMode && (
              <div className="fixed inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-4 py-2 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  {chapterVerseSelector}
                  <div className="flex items-center gap-1">
                    {fontSizeControls}
                  </div>
                </div>
                <ZenDialog.Close
                  aria-label="Quitter le mode Zen"
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground opacity-60 transition-opacity hover:opacity-100"
                    />
                  }
                >
                  <Minimize2 />
                  <span className="hidden sm:inline">Quitter le mode Zen</span>
                </ZenDialog.Close>
              </div>
            )}
            <div className="min-h-full px-6 pt-20 pb-12">
              {zenMode && readingContent}
            </div>
          </ZenDialog.Popup>
        </ZenDialog.Portal>
      </ZenDialog.Root>

      <Menu.Root
        open={statusMenu !== null}
        onOpenChange={(open) => {
          if (!open) setStatusMenu(null);
        }}
      >
        <Menu.Portal>
          <Menu.Positioner
            className="outline-none"
            anchor={
              statusMenu ? pointAnchor(statusMenu.x, statusMenu.y) : undefined
            }
            sideOffset={2}
          >
            <Menu.Popup className="z-50 min-w-44 origin-(--transform-origin) overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
              {MEMORIZATION_CYCLE.map((status) => {
                const isActive =
                  statusMenu != null &&
                  (statusMap[statusMenu.verseKey] ?? null) === status;
                return (
                  <Menu.Item
                    key={status ?? "none"}
                    className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    onClick={() => {
                      if (statusMenu)
                        applyVerseStatus(statusMenu.verseKey, status);
                    }}
                  >
                    <span
                      className={cn(
                        "size-2.5 shrink-0 rounded-full",
                        status
                          ? MEMORIZATION_STYLES[status].solid
                          : "bg-muted-foreground/40",
                      )}
                    />
                    {memorizationStatusLabel(status)}
                    {isActive && <Check className="ml-auto size-3.5" />}
                  </Menu.Item>
                );
              })}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
