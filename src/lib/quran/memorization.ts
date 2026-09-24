import type { MemorizationStatus } from "@/lib/db/schema";
import { CHAPTER_WORD_COUNTS } from "@/lib/quran/chapter-word-counts";
import type { QuranChapter } from "@/lib/quran/types";

export const MEMORIZATION_STYLES: Record<
  MemorizationStatus,
  { tint: string; solid: string; stroke: string; label: string }
> = {
  maitrise: {
    tint: "bg-emerald-500/10",
    solid: "bg-emerald-500",
    stroke: "stroke-emerald-500",
    label: "Maîtrisé",
  },
  en_cours: {
    tint: "bg-amber-500/10",
    solid: "bg-amber-500",
    stroke: "stroke-amber-500",
    label: "En cours",
  },
  a_renforcer: {
    tint: "bg-rose-500/10",
    solid: "bg-rose-500",
    stroke: "stroke-rose-500",
    label: "À renforcer",
  },
};

// Tap-to-cycle order in the reader: not started -> learning -> needs
// reinforcement -> mastered -> back to not started. Also drives the
// right-click status menu's option order.
export const MEMORIZATION_CYCLE: (MemorizationStatus | null)[] = [
  null,
  "en_cours",
  "a_renforcer",
  "maitrise",
];

// Human-readable label for the tap-to-cycle toast — "Non commencé" has no
// entry in MEMORIZATION_STYLES since it renders with no tint at all.
export function memorizationStatusLabel(
  status: MemorizationStatus | null
): string {
  return status ? MEMORIZATION_STYLES[status].label : "Non commencé";
}

export function nextMemorizationStatus(
  current: MemorizationStatus | null
): MemorizationStatus | null {
  const index = MEMORIZATION_CYCLE.indexOf(current);
  return MEMORIZATION_CYCLE[(index + 1) % MEMORIZATION_CYCLE.length];
}

export type ChapterMemorizationSummary = {
  chapter: QuranChapter;
  maitrise: number;
  enCours: number;
  aRenforcer: number;
  tracked: number;
};

// Per-sourate breakdown for the "Ma progression" table — every sourate is
// returned (sorted by chapter id), including untracked ones at zero, so the
// table always shows all 114 rows rather than only the ones touched so far.
export function computeChapterMemorizationSummaries(
  chapters: QuranChapter[],
  statusMap: Record<string, MemorizationStatus>
): ChapterMemorizationSummary[] {
  const byChapter = new Map<
    number,
    { maitrise: number; enCours: number; aRenforcer: number }
  >();
  for (const [verseKey, status] of Object.entries(statusMap)) {
    const chapterId = Number(verseKey.split(":")[0]);
    const counts = byChapter.get(chapterId) ?? {
      maitrise: 0,
      enCours: 0,
      aRenforcer: 0,
    };
    if (status === "maitrise") counts.maitrise += 1;
    else if (status === "en_cours") counts.enCours += 1;
    else if (status === "a_renforcer") counts.aRenforcer += 1;
    byChapter.set(chapterId, counts);
  }

  return chapters
    .map((chapter) => {
      const counts = byChapter.get(chapter.id) ?? {
        maitrise: 0,
        enCours: 0,
        aRenforcer: 0,
      };
      return {
        chapter,
        ...counts,
        tracked: counts.maitrise + counts.enCours + counts.aRenforcer,
      };
    })
    .sort((a, b) => a.chapter.id - b.chapter.id);
}

// Single-status summary of a sourate's memorization for badges/sorting: a
// sourate needing reinforcement anywhere still shows as "à renforcer" even
// if most of it is mastered, since that's the part that needs attention.
export function chapterMemorizationStatus(
  summary: ChapterMemorizationSummary
): MemorizationStatus | null {
  if (summary.maitrise === summary.chapter.versesCount) return "maitrise";
  if (summary.aRenforcer > 0) return "a_renforcer";
  if (summary.tracked > 0) return "en_cours";
  return null;
}

// Mirrors what setChapterMemorizedCount does server-side: verses 1..count
// become "maîtrisé", anything past count is cleared — applied locally right
// away so the UI updates without waiting on a server round-trip.
export function applyChapterCount(
  prev: Record<string, MemorizationStatus>,
  chapter: QuranChapter,
  count: number
): Record<string, MemorizationStatus> {
  const next = { ...prev };
  for (let verseNumber = 1; verseNumber <= chapter.versesCount; verseNumber++) {
    const key = `${chapter.id}:${verseNumber}`;
    if (verseNumber <= count) next[key] = "maitrise";
    else delete next[key];
  }
  return next;
}

export type WordProgressBreakdown = {
  maitrise: number;
  enCours: number;
  aRenforcer: number;
  nonCommence: number;
  total: number;
};

// Only per-verse status is tracked, not per-verse word counts, so each
// sourate's words are treated as evenly spread across its verses — a rough
// approximation, but one that corrects the much bigger skew between short
// and long sourates (raw verse counts would weigh them equally).
export function computeWordProgressBreakdown(
  summaries: ChapterMemorizationSummary[]
): WordProgressBreakdown {
  const totals = {
    maitrise: 0,
    enCours: 0,
    aRenforcer: 0,
    nonCommence: 0,
    total: 0,
  };

  for (const summary of summaries) {
    const chapterWords = CHAPTER_WORD_COUNTS[summary.chapter.id] ?? 0;
    const perVerse = chapterWords / summary.chapter.versesCount;
    const maitriseWords = summary.maitrise * perVerse;
    const enCoursWords = summary.enCours * perVerse;
    const aRenforcerWords = summary.aRenforcer * perVerse;

    totals.maitrise += maitriseWords;
    totals.enCours += enCoursWords;
    totals.aRenforcer += aRenforcerWords;
    totals.nonCommence +=
      chapterWords - maitriseWords - enCoursWords - aRenforcerWords;
    totals.total += chapterWords;
  }

  return totals;
}

export type ChapterListEntry = ChapterMemorizationSummary & {
  progress: number;
};

// Sourates with at least one verse tracked but not yet fully mastered,
// closest-to-done first — a short-term target to finish.
export function findApproachingMastery(
  summaries: ChapterMemorizationSummary[],
  limit: number
): ChapterListEntry[] {
  return summaries
    .filter((s) => s.tracked > 0 && s.maitrise < s.chapter.versesCount)
    .map((s) => ({ ...s, progress: s.maitrise / s.chapter.versesCount }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, limit);
}

// Sourates with at least one verse flagged "à renforcer", most-affected
// first — a revision reminder list.
export function findNeedingReinforcement(
  summaries: ChapterMemorizationSummary[],
  limit: number
): ChapterListEntry[] {
  return summaries
    .filter((s) => s.aRenforcer > 0)
    .map((s) => ({ ...s, progress: s.aRenforcer / s.chapter.versesCount }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, limit);
}

export type RecentActivityEntry = { chapter: QuranChapter; updatedAt: string };

// Sourates most recently touched, based on the latest per-verse updatedAt —
// not a real session history (none is tracked), just a "pick up where you
// left off" signal.
export function findRecentActivity(
  chapters: QuranChapter[],
  recentActivity: Record<number, string>,
  limit: number
): RecentActivityEntry[] {
  return chapters
    .filter((c) => recentActivity[c.id] !== undefined)
    .map((c) => ({ chapter: c, updatedAt: recentActivity[c.id] }))
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, limit);
}
