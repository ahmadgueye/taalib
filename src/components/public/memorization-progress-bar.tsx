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
//
// `full` : barre d'outils desktop. `thin` : simple trait sous la barre
// d'outils mobile, sans texte. `panel` : réglages mobiles, empilé.
export function MemorizationProgressBar({
  chapterId,
  statusMap,
  totalVerses,
  variant = "full",
  className,
}: {
  chapterId: number;
  statusMap: Record<string, MemorizationStatus>;
  totalVerses: number;
  variant?: "full" | "thin" | "panel";
  className?: string;
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

  const cells = verses.map(({ verseNumber, status }) => (
    <div
      key={verseNumber}
      className={cn("h-full flex-1", status && MEMORIZATION_STYLES[status].solid)}
      title={`Verset ${verseNumber} — ${memorizationStatusLabel(status)}`}
    />
  ));
  const label = `${memorizedPercent}% maîtrisé (${maitriseCount}/${totalVerses})`;
  const manageLink = (
    <Link
      href="/memorisation"
      className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
    >
      Gérer mon parcours
    </Link>
  );

  if (variant === "thin") {
    return (
      <div
        role="img"
        aria-label={label}
        className={cn("flex h-0.5 w-full bg-muted", className)}
      >
        {cells}
      </div>
    );
  }

  if (variant === "panel") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
          {cells}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{label}</span>
          {manageLink}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-3 px-6 py-2",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-1.5 w-60 shrink-0 overflow-hidden rounded-full bg-muted">
          {cells}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="ml-auto">{manageLink}</div>
    </div>
  );
}
