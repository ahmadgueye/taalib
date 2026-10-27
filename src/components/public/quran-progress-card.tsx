import Link from "next/link";
import { MoveRight } from "lucide-react";

import { ProgressRing } from "@/components/public/progress-ring";
import { Button } from "@/components/ui/button";
import type { MemorizationStatus } from "@/lib/db/schema";
import {
  computeChapterMemorizationSummaries,
  computeWordProgressBreakdown,
} from "@/lib/quran/memorization";
import type { QuranChapter } from "@/lib/quran/types";

function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

// Résumé de la mémorisation pour la page compte. Le détail reste sur
// /memorisation : même calcul (au prorata des mots), pour que les deux pages
// affichent le même pourcentage.
export function QuranProgressCard({
  chapters,
  statusMap,
  dueCount,
}: {
  chapters: QuranChapter[];
  statusMap: Record<string, MemorizationStatus>;
  dueCount: number;
}) {
  const summaries = computeChapterMemorizationSummaries(chapters, statusMap);
  const breakdown = computeWordProgressBreakdown(summaries);
  const percent =
    breakdown.total > 0 ? (breakdown.maitrise / breakdown.total) * 100 : 0;
  const maitrise = summaries.reduce((n, s) => n + s.maitrise, 0);
  const enCours = summaries.reduce((n, s) => n + s.enCours, 0);
  const aRenforcer = summaries.reduce((n, s) => n + s.aRenforcer, 0);
  const started = maitrise + enCours + aRenforcer > 0;

  return (
    <div className="flex flex-col gap-4 border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="relative flex size-14 shrink-0 items-center justify-center">
          <ProgressRing value={percent} size={56} strokeWidth={5} />
          <span className="absolute text-xs font-medium tabular-nums">
            {percent < 10 && percent > 0
              ? percent.toFixed(1)
              : Math.round(percent)}
            %
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-medium">
            {started ? "Coran maîtrisé" : "Pas encore de verset suivi"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {started
              ? [
                  plural(maitrise, "verset maîtrisé", "versets maîtrisés"),
                  enCours > 0 && `${enCours} en cours`,
                  aRenforcer > 0 && `${aRenforcer} à renforcer`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Marque les versets que tu apprends depuis le lecteur du Coran."}
          </p>
          {dueCount > 0 && (
            <p className="mt-1 text-xs font-medium text-primary">
              {plural(dueCount, "verset", "versets")} à réviser aujourd&apos;hui
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {dueCount > 0 && (
          <Button
            render={<Link href="/memorisation/revision" />}
            nativeButton={false}
          >
            Réviser
          </Button>
        )}
        <Button
          variant={dueCount > 0 ? "outline" : "default"}
          render={<Link href={started ? "/memorisation" : "/coran"} />}
          nativeButton={false}
        >
          {started ? "Voir ma mémorisation" : "Ouvrir le Coran"}
          <MoveRight />
        </Button>
      </div>
    </div>
  );
}
