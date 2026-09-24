import Link from "next/link";

import type { MemorizationStatus } from "@/lib/db/schema";
import {
  computeChapterMemorizationSummaries,
  computeWordProgressBreakdown,
  findApproachingMastery,
  findNeedingReinforcement,
  findRecentActivity,
  MEMORIZATION_STYLES,
  type ChapterListEntry,
  type WordProgressBreakdown,
} from "@/lib/quran/memorization";
import type { QuranChapter } from "@/lib/quran/types";
import { cn } from "@/lib/utils";

const LIST_SIZE = 3;

const NON_COMMENCE_STYLE = {
  solid: "bg-muted-foreground/40",
  stroke: "stroke-muted-foreground/25",
  label: "Non commencé",
};

function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}

function formatRelativeDate(iso: string): string {
  const diffDays = Math.round(
    (new Date(iso).getTime() - Date.now()) / 86_400_000,
  );
  return new Intl.RelativeTimeFormat("fr", { numeric: "auto" }).format(
    diffDays,
    "day",
  );
}

function StatusDonut({
  breakdown,
  size = 144,
  strokeWidth = 16,
}: {
  breakdown: WordProgressBreakdown;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 3;

  const segments = [
    { key: "maitrise", value: breakdown.maitrise, ...MEMORIZATION_STYLES.maitrise },
    { key: "en_cours", value: breakdown.enCours, ...MEMORIZATION_STYLES.en_cours },
    {
      key: "a_renforcer",
      value: breakdown.aRenforcer,
      ...MEMORIZATION_STYLES.a_renforcer,
    },
    { key: "non_commence", value: breakdown.nonCommence, ...NON_COMMENCE_STYLE },
  ];

  let cumulative = 0;

  return (
    <svg
      width={size}
      height={size}
      className="-rotate-90 shrink-0"
      role="img"
      aria-label="Répartition de la mémorisation par statut"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className="fill-none stroke-muted"
      />
      {segments.map((segment) => {
        if (segment.value <= 0 || breakdown.total <= 0) return null;
        const share = segment.value / breakdown.total;
        const length = Math.max(share * circumference - gap, 0);
        const offset = -cumulative;
        cumulative += share * circumference;
        return (
          <circle
            key={segment.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("fill-none transition-all duration-300", segment.stroke)}
          >
            <title>{`${segment.label} : ${formatPercent(share)}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

function DonutLegend({ breakdown }: { breakdown: WordProgressBreakdown }) {
  const segments = [
    { key: "maitrise", value: breakdown.maitrise, ...MEMORIZATION_STYLES.maitrise },
    { key: "en_cours", value: breakdown.enCours, ...MEMORIZATION_STYLES.en_cours },
    {
      key: "a_renforcer",
      value: breakdown.aRenforcer,
      ...MEMORIZATION_STYLES.a_renforcer,
    },
    { key: "non_commence", value: breakdown.nonCommence, ...NON_COMMENCE_STYLE },
  ];

  return (
    <ul className="flex flex-col gap-2 text-sm">
      {segments.map((segment) => (
        <li key={segment.key} className="flex items-center gap-2">
          <span className={cn("size-2.5 shrink-0 rounded-full", segment.solid)} />
          <span className="text-muted-foreground">{segment.label}</span>
          <span className="ml-auto tabular-nums font-medium">
            {formatPercent(breakdown.total > 0 ? segment.value / breakdown.total : 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ChapterListCard({
  title,
  entries,
  emptyLabel,
  renderMeta,
}: {
  title: string;
  entries: ChapterListEntry[];
  emptyLabel: string;
  renderMeta: (entry: ChapterListEntry) => string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {entries.map((entry) => (
            <li key={entry.chapter.id}>
              <Link
                href={`/coran?sourate=${entry.chapter.id}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <span className="tabular-nums text-muted-foreground">
                  {entry.chapter.id}.
                </span>
                <span className="truncate">{entry.chapter.nameSimple}</span>
                <span className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">
                  {renderMeta(entry)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MemorizationDashboard({
  chapters,
  statusMap,
  recentActivity,
}: {
  chapters: QuranChapter[];
  statusMap: Record<string, MemorizationStatus>;
  recentActivity: Record<number, string>;
}) {
  const summaries = computeChapterMemorizationSummaries(chapters, statusMap);
  const breakdown = computeWordProgressBreakdown(summaries);
  const masteredChapters = summaries.filter(
    (s) => s.maitrise === s.chapter.versesCount,
  ).length;
  const globalRatio = breakdown.total > 0 ? breakdown.maitrise / breakdown.total : 0;

  const approachingMastery = findApproachingMastery(summaries, LIST_SIZE);
  const needingReinforcement = findNeedingReinforcement(summaries, LIST_SIZE);
  const recent = findRecentActivity(chapters, recentActivity, LIST_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-5 rounded-xl border p-5">
          <div className="relative shrink-0">
            <svg
              width={96}
              height={96}
              className="-rotate-90"
              role="img"
              aria-label={`Progression globale : ${formatPercent(globalRatio)}`}
            >
              <circle
                cx={48}
                cy={48}
                r={40}
                strokeWidth={8}
                className="fill-none stroke-muted"
              />
              <circle
                cx={48}
                cy={48}
                r={40}
                strokeWidth={8}
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 - globalRatio * 2 * Math.PI * 40}
                strokeLinecap="round"
                className="fill-none stroke-emerald-500 transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center rotate-0 text-sm font-semibold tabular-nums">
              {formatPercent(globalRatio)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">Progression globale</p>
            <p className="text-sm text-muted-foreground">
              {masteredChapters}/{chapters.length} sourates maîtrisées
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pondérée par le nombre de mots de chaque sourate.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 rounded-xl border p-5">
          <StatusDonut breakdown={breakdown} />
          <DonutLegend breakdown={breakdown} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ChapterListCard
          title="Proches de la maîtrise"
          entries={approachingMastery}
          emptyLabel="Rien pour l'instant — commence une sourate pour la voir ici."
          renderMeta={(e) => formatPercent(e.progress)}
        />
        <ChapterListCard
          title="À renforcer"
          entries={needingReinforcement}
          emptyLabel="Rien à renforcer pour l'instant."
          renderMeta={(e) => `${e.aRenforcer} verset${e.aRenforcer > 1 ? "s" : ""}`}
        />
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-medium">Reprise récente</h3>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune activité récente.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {recent.map(({ chapter, updatedAt }) => (
                <li key={chapter.id}>
                  <Link
                    href={`/coran?sourate=${chapter.id}`}
                    className="flex items-center gap-2 text-sm hover:underline"
                  >
                    <span className="tabular-nums text-muted-foreground">
                      {chapter.id}.
                    </span>
                    <span className="truncate">{chapter.nameSimple}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {formatRelativeDate(updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
