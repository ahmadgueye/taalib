"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { setChapterMemorizedCount } from "@/lib/actions/memorization";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MemorizationStatus } from "@/lib/db/schema";
import {
  chapterMemorizationStatus,
  computeChapterMemorizationSummaries,
  MEMORIZATION_STYLES,
  memorizationStatusLabel,
} from "@/lib/quran/memorization";
import { cn } from "@/lib/utils";
import type { QuranChapter } from "@/lib/quran/types";

type SortKey = "chapter" | "status" | "memorized" | "progress";
type SortState = { key: SortKey; direction: "asc" | "desc" };

// Rank used to sort the "Statut" column — mirrors the tap-to-cycle order so
// sorting by status reads top-to-bottom the same way progress accrues.
const STATUS_RANK: Record<"none" | MemorizationStatus, number> = {
  none: 0,
  en_cours: 1,
  a_renforcer: 2,
  maitrise: 3,
};

// Mirrors what setChapterMemorizedCount does server-side: verses 1..count
// become "maîtrisé", anything past count is cleared — applied locally right
// away so the row updates without waiting on a server round-trip.
function applyChapterCount(
  prev: Record<string, MemorizationStatus>,
  chapter: QuranChapter,
  count: number,
): Record<string, MemorizationStatus> {
  const next = { ...prev };
  for (let verseNumber = 1; verseNumber <= chapter.versesCount; verseNumber++) {
    const key = `${chapter.id}:${verseNumber}`;
    if (verseNumber <= count) next[key] = "maitrise";
    else delete next[key];
  }
  return next;
}

// Accent/case-insensitive match against a sourate's names or its number, so
// "ikhlass" or "112" both find An-Nas... er, Al-Ikhlas.
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesQuery(chapter: QuranChapter, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  return (
    normalize(chapter.nameSimple).includes(q) ||
    normalize(chapter.nameTranslated).includes(q) ||
    chapter.nameArabic.includes(query.trim()) ||
    String(chapter.id).includes(q)
  );
}

function StatusBadge({ status }: { status: MemorizationStatus | null }) {
  const style = status ? MEMORIZATION_STYLES[status] : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        style ? style.tint : "bg-muted",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          style ? style.solid : "bg-muted-foreground/40",
        )}
      />
      {memorizationStatusLabel(status)}
    </span>
  );
}

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = active
    ? sort.direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className="size-3.5" />
      </button>
    </TableHead>
  );
}

function MemorizedCountInput({
  chapter,
  memorizedCount,
  onCommit,
}: {
  chapter: QuranChapter;
  memorizedCount: number;
  onCommit: (count: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(String(memorizedCount));
  const [isPending, startTransition] = useTransition();
  const focusedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the draft in sync when the committed value changes from elsewhere
  // (e.g. a verse tapped to "à renforcer" in the reader lowers the count) —
  // but not while the user is actively editing the field.
  useEffect(() => {
    if (!focusedRef.current) setDraft(String(memorizedCount));
  }, [memorizedCount]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function commit(value: string) {
    const parsed = Number(value);
    if (
      !Number.isInteger(parsed) ||
      parsed < 0 ||
      parsed > chapter.versesCount
    ) {
      toast.error(
        `Entre un nombre entre 0 et ${chapter.versesCount} pour ${chapter.nameSimple}.`,
      );
      setDraft(String(memorizedCount));
      return;
    }
    if (parsed === memorizedCount) return;

    startTransition(async () => {
      await onCommit(parsed);
    });
  }

  // Commits shortly after the user stops typing, so the row updates without
  // needing to blur the field first — blur still flushes immediately.
  function handleChange(value: string) {
    setDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(value), 600);
  }

  function handleBlur() {
    focusedRef.current = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commit(draft);
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      max={chapter.versesCount}
      value={draft}
      disabled={isPending}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className="h-7 w-16 text-right tabular-nums"
    />
  );
}

export function MemorizationSummary({
  chapters,
  statusMap,
}: {
  chapters: QuranChapter[];
  statusMap: Record<string, MemorizationStatus>;
}) {
  const [localStatusMap, setLocalStatusMap] = useState(statusMap);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({
    key: "chapter",
    direction: "asc",
  });

  const summaries = useMemo(
    () => computeChapterMemorizationSummaries(chapters, localStatusMap),
    [chapters, localStatusMap],
  );

  const rows = useMemo(() => {
    const withDerived = summaries
      .filter((summary) => matchesQuery(summary.chapter, query))
      .map((summary) => ({
        summary,
        status: chapterMemorizationStatus(summary),
        progress: summary.maitrise / summary.chapter.versesCount,
      }));

    const compare = (
      a: (typeof withDerived)[number],
      b: (typeof withDerived)[number],
    ) => {
      switch (sort.key) {
        case "chapter":
          return a.summary.chapter.id - b.summary.chapter.id;
        case "status":
          return (
            STATUS_RANK[a.status ?? "none"] - STATUS_RANK[b.status ?? "none"]
          );
        case "memorized":
          return a.summary.maitrise - b.summary.maitrise;
        case "progress":
          return a.progress - b.progress;
      }
    };

    const sorted = [...withDerived].sort(compare);
    return sort.direction === "asc" ? sorted : sorted.reverse();
  }, [summaries, sort, query]);

  const completedCount = summaries.filter(
    (s) => s.maitrise === s.chapter.versesCount,
  ).length;

  function handleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }

  async function handleCommitCount(chapter: QuranChapter, count: number) {
    const result = await setChapterMemorizedCount(chapter.id, count);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setLocalStatusMap((prev) => applyChapterCount(prev, chapter, count));
    toast.success(
      count === chapter.versesCount
        ? `${chapter.nameSimple} maîtrisée à 100% !`
        : "Progression enregistrée.",
    );
  }

  return (
    <div>
      <div className="relative mb-3 max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher une sourate…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead
                label="Sourate"
                sortKey="chapter"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHead
                label="Statut"
                sortKey="status"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHead
                label="Mémorisés"
                sortKey="memorized"
                sort={sort}
                onSort={handleSort}
                className="text-right"
              />
              <TableHead>Modifier</TableHead>
              <SortableHead
                label="Progression"
                sortKey="progress"
                sort={sort}
                onSort={handleSort}
                className="w-40"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="py-6 text-center text-muted-foreground"
                >
                  Aucune sourate ne correspond à « {query} ».
                </TableCell>
              </TableRow>
            )}
            {rows.map(({ summary, status, progress }) => {
              const fullyMastered =
                summary.maitrise === summary.chapter.versesCount;
              const percent = Math.round(progress * 100);
              return (
                <TableRow key={summary.chapter.id}>
                  <TableCell className="max-w-0">
                    <span className="flex items-center gap-2 truncate">
                      <span className="tabular-nums text-muted-foreground">
                        {summary.chapter.id}.
                      </span>
                      <span className="truncate">
                        {summary.chapter.nameSimple}
                      </span>
                      {fullyMastered && (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {summary.maitrise}/{summary.chapter.versesCount}
                  </TableCell>
                  <TableCell>
                    <MemorizedCountInput
                      chapter={summary.chapter}
                      memorizedCount={summary.maitrise}
                      onCommit={(count) =>
                        handleCommitCount(summary.chapter, count)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            MEMORIZATION_STYLES.maitrise.solid,
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {percent}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="border-t bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
          Terminé : {completedCount}/{chapters.length} sourates
        </div>
      </div>
    </div>
  );
}
