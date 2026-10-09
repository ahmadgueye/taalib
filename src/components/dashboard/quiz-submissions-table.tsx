"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Attempt = {
  id: string;
  score: number;
  totalQuestions: number;
  completedAt: Date;
};

type StudentRow = {
  user: { id: string; fullName: string | null; email: string };
  attempts: Attempt[];
  bestScore: number;
  bestTotal: number;
  lastCompletedAt: Date;
  attemptsCount: number;
};

function ScoreBadge({
  score,
  total,
  passingScore,
}: {
  score: number;
  total: number;
  passingScore: number;
}) {
  const passed = (score / total) * 100 >= passingScore;
  return (
    <Badge
      className={cn(
        passed
          ? "bg-emerald-600 text-white dark:bg-emerald-500"
          : "bg-destructive text-white"
      )}
    >
      {score}/{total}
    </Badge>
  );
}

export function QuizSubmissionsTable({
  students,
  passingScore,
}: {
  students: StudentRow[];
  passingScore: number;
}) {
  const [selected, setSelected] = useState<StudentRow | null>(null);

  return (
    <>
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Étudiant</TableHead>
            <TableHead>Meilleur score</TableHead>
            <TableHead>Tentatives</TableHead>
            <TableHead>Dernière tentative</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((s) => (
            <TableRow
              key={s.user.id}
              className="cursor-pointer"
              onClick={() => setSelected(s)}
            >
              <TableCell>{s.user.fullName ?? s.user.email}</TableCell>
              <TableCell>
                <ScoreBadge
                  score={s.bestScore}
                  total={s.bestTotal}
                  passingScore={passingScore}
                />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {s.attemptsCount}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {s.lastCompletedAt.toLocaleString("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Tentatives — {selected?.user.fullName ?? selected?.user.email}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {selected?.attempts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 border p-3 text-sm"
              >
                <span className="text-muted-foreground">
                  {a.completedAt.toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <ScoreBadge
                  score={a.score}
                  total={a.totalQuestions}
                  passingScore={passingScore}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
