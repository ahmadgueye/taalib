import Link from "next/link";

import type { MemorizationStatus } from "@/lib/db/schema";
import {
  MEMORIZATION_STYLES,
  memorizationStatusLabel,
} from "@/lib/quran/memorization";
import { cn } from "@/lib/utils";

// One cell per verse, in verse order — the cell at index N reflects verse
// N+1's status directly, so tapping a verse in the reader visibly updates
// the bar at that verse's own position rather than just shifting an
// aggregate count around.
export function MemorizationProgressBar({
  chapterId,
  statusMap,
  totalVerses,
}: {
  chapterId: number;
  statusMap: Record<string, MemorizationStatus>;
  totalVerses: number;
}) {
  const verses = Array.from({ length: totalVerses }, (_, i) => {
    const verseNumber = i + 1;
    return {
      verseNumber,
      status: statusMap[`${chapterId}:${verseNumber}`] ?? null,
    };
  });
  const maitriseCount = verses.filter((v) => v.status === "maitrise").length;
  const memorizedPercent = Math.round((maitriseCount / totalVerses) * 100);

  return (
    <div className="flex flex-wrap justify-center items-center gap-3 px-6 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-1.5 w-60 shrink-0 overflow-hidden rounded-full bg-muted">
          {verses.map(({ verseNumber, status }) => (
            <div
              key={verseNumber}
              className={cn(
                "h-full flex-1",
                status && MEMORIZATION_STYLES[status].solid,
              )}
              title={`Verset ${verseNumber} — ${memorizationStatusLabel(status)}`}
            />
          ))}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {memorizedPercent}% maîtrisé ({maitriseCount}/{totalVerses})
        </span>
      </div>
      <Link
        href="/memorisation"
        className="ml-auto shrink-0 text-xs block text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Gérer mon parcours
      </Link>
    </div>
  );
}
