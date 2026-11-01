"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, TriangleAlert } from "lucide-react";

import { SortableTableHead } from "@/components/dashboard/sortable-table-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  INACTIVE_AFTER_DAYS,
  isInactive,
  type StudentProgress,
} from "@/lib/class-progress";
import { cn } from "@/lib/utils";

type SortKey = "name" | "lessons" | "quiz" | "quran" | "activity";

const ratio = (done: number, total: number) => (total > 0 ? done / total : 1);

function sortValue(row: StudentProgress, key: SortKey): number | string {
  switch (key) {
    case "name":
      return row.name.toLocaleLowerCase("fr");
    case "lessons":
      return ratio(row.lessons.read, row.lessons.total);
    case "quiz":
      return ratio(row.quiz.passed, row.quiz.total);
    case "quran":
      return row.quran.percent;
    case "activity":
      return row.lastActivityAt?.getTime() ?? 0;
  }
}

const relativeFormat = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

function formatActivity(date: Date | null, now: Date) {
  if (!date) return "Jamais";
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  return relativeFormat.format(-days, "day");
}

function formatPercent(value: number) {
  return value > 0 && value < 10 ? value.toFixed(1) : String(Math.round(value));
}

function MiniBar({ value }: { value: number }) {
  return (
    <div className="mt-1 h-1 w-20 bg-muted">
      <div className="h-full bg-primary" style={{ width: `${value * 100}%` }} />
    </div>
  );
}

function ProgressRows({
  classId,
  rows,
  now,
}: {
  classId: string;
  rows: StudentProgress[];
  now: Date;
}) {
  return rows.map((row) => {
    const inactive = isInactive(row.lastActivityAt, now);
    return (
      <TableRow key={row.userId}>
        <TableCell>
          <Link
            href={`/dashboard/classes/${classId}/etudiants/${row.userId}`}
            className="font-medium underline-offset-2 hover:underline"
          >
            {row.name}
          </Link>
          {row.name !== row.email && (
            <p className="text-xs text-muted-foreground">{row.email}</p>
          )}
        </TableCell>
        <TableCell className="tabular-nums">
          {row.lessons.total > 0 ? (
            <>
              {row.lessons.read}/{row.lessons.total}
              <MiniBar value={row.lessons.read / row.lessons.total} />
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="tabular-nums">
          {row.quiz.total > 0 ? (
            <>
              {row.quiz.passed}/{row.quiz.total} réussis
              {row.quiz.averageScore !== null && (
                <p className="text-xs text-muted-foreground">
                  moy. {Math.round(row.quiz.averageScore)} %
                </p>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="tabular-nums">
          {formatPercent(row.quran.percent)} %
          {row.quran.aRenforcer > 0 && (
            <p className="text-xs text-rose-600">
              {row.quran.aRenforcer} à renforcer
            </p>
          )}
        </TableCell>
        <TableCell>
          <span
            className={cn(
              "inline-flex items-center gap-1",
              inactive ? "text-amber-600" : "text-muted-foreground"
            )}
            title={
              inactive
                ? `Aucune activité depuis plus de ${INACTIVE_AFTER_DAYS} jours`
                : undefined
            }
          >
            {formatActivity(row.lastActivityAt, now)}
            {inactive && <TriangleAlert className="size-3.5" />}
          </span>
        </TableCell>
      </TableRow>
    );
  });
}

export function ClassProgressTable({
  classId,
  students,
  now,
}: {
  classId: string;
  students: StudentProgress[];
  now: Date;
}) {
  // Par défaut, les moins avancés en leçons d'abord : on repère qui décroche.
  const [sortKey, setSortKey] = useState<SortKey>("lessons");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showFormer, setShowFormer] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const [active, former] = useMemo(() => {
    const sorted = [...students].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      const cmp =
        typeof va === "string" && typeof vb === "string"
          ? va.localeCompare(vb, "fr")
          : (va as number) - (vb as number);
      return (sortDir === "asc" ? cmp : -cmp) || a.name.localeCompare(b.name, "fr");
    });
    return [
      sorted.filter((s) => s.leftAt === null),
      sorted.filter((s) => s.leftAt !== null),
    ];
  }, [students, sortKey, sortDir]);

  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun étudiant dans cette classe pour l&apos;instant.
      </p>
    );
  }

  const head = (label: string, key: SortKey) => (
    <SortableTableHead
      label={label}
      sortKey={key}
      currentKey={sortKey}
      direction={sortDir}
      onSort={handleSort}
    />
  );

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            {head("Étudiant", "name")}
            {head("Leçons", "lessons")}
            {head("Quiz", "quiz")}
            {head("Qur'an", "quran")}
            {head("Dernière activité", "activity")}
          </TableRow>
        </TableHeader>
        <TableBody>
          <ProgressRows classId={classId} rows={active} now={now} />
          {showFormer && former.length > 0 && (
            <>
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="pt-6 text-xs font-medium text-muted-foreground"
                >
                  Anciens élèves
                </TableCell>
              </TableRow>
              <ProgressRows classId={classId} rows={former} now={now} />
            </>
          )}
        </TableBody>
      </Table>
      {former.length > 0 && (
        <button
          type="button"
          onClick={() => setShowFormer((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn("size-4 transition-transform", showFormer && "rotate-180")}
          />
          {showFormer
            ? "Masquer les anciens élèves"
            : `Afficher les anciens élèves (${former.length})`}
        </button>
      )}
    </div>
  );
}
