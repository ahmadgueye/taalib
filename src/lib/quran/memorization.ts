import type { MemorizationStatus } from "@/lib/db/schema";
import type { QuranChapter } from "@/lib/quran/types";

export const MEMORIZATION_STYLES: Record<
  MemorizationStatus,
  { tint: string; solid: string; label: string }
> = {
  maitrise: {
    tint: "bg-emerald-500/10",
    solid: "bg-emerald-500",
    label: "Maîtrisé",
  },
  en_cours: {
    tint: "bg-amber-500/10",
    solid: "bg-amber-500",
    label: "En cours",
  },
  a_renforcer: {
    tint: "bg-rose-500/10",
    solid: "bg-rose-500",
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
