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

function formatPercent(percent: number) {
  return percent < 10 && percent > 0
    ? percent.toFixed(1).replace(".", ",")
    : String(Math.round(percent));
}

// Résumé de la mémorisation pour la page compte. Le détail reste sur
// /memorisation : même calcul (au prorata des mots), pour que les deux pages
// affichent le même pourcentage.
export function QuranProgressCard({
  chapters,
  statusMap,
  lastChapterId,
}: {
  chapters: QuranChapter[];
  statusMap: Record<string, MemorizationStatus>;
  // Sourate du dernier verset marqué, s'il y en a un.
  lastChapterId: number | null;
}) {
  const summaries = computeChapterMemorizationSummaries(chapters, statusMap);
  const breakdown = computeWordProgressBreakdown(summaries);
  const share = (words: number) =>
    breakdown.total > 0 ? (words / breakdown.total) * 100 : 0;
  const percent = share(breakdown.maitrise);
  const maitrise = summaries.reduce((n, s) => n + s.maitrise, 0);
  const enCours = summaries.reduce((n, s) => n + s.enCours, 0);
  const aRenforcer = summaries.reduce((n, s) => n + s.aRenforcer, 0);
  const started = maitrise + enCours + aRenforcer > 0;
  const lastChapter = chapters.find((c) => c.id === lastChapterId);

  // Couleurs de clartés différentes, pas seulement de teintes.
  const legend = [
    { label: "Maîtrisés", count: maitrise, words: breakdown.maitrise, color: "bg-foreground" },
    { label: "En cours", count: enCours, words: breakdown.enCours, color: "bg-chart-1" },
    { label: "À renforcer", count: aRenforcer, words: breakdown.aRenforcer, color: "bg-chart-2" },
  ];

  return (
    <div className="flex flex-col gap-4 bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="relative flex size-16 shrink-0 items-center justify-center">
          <ProgressRing value={percent} size={64} strokeWidth={6} />
          <span className="absolute text-xs font-bold tabular-nums">
            {formatPercent(percent)} %
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold">
            {started
              ? plural(maitrise, "verset maîtrisé", "versets maîtrisés")
              : "Pas encore de verset suivi"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {started
              ? lastChapter
                ? `Dernière sourate : ${lastChapter.nameSimple}`
                : "du Qur'an, au prorata des mots"
              : "Marque les versets que tu apprends depuis le lecteur du Qur'an."}
          </p>
        </div>
      </div>

      {started && (
        <>
          <div aria-hidden className="flex h-2.5 bg-foreground/10">
            {legend.map((item) => (
              <div
                key={item.label}
                className={item.color}
                style={{ width: `${share(item.words)}%` }}
              />
            ))}
          </div>
          <ul className="flex flex-col gap-1.5 text-sm">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span aria-hidden className={`size-2.5 ${item.color}`} />
                <span className="flex-1">{item.label}</span>
                <span className="font-semibold tabular-nums">{item.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Button
        render={<Link href={started ? "/memorisation" : "/coran"} />}
        nativeButton={false}
      >
        {started ? "Voir ma mémorisation" : "Ouvrir le Qur'an"}
        <MoveRight />
      </Button>
    </div>
  );
}
