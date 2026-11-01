import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClassQuizProgress } from "@/lib/class-progress";

type OutlineQuiz = { id: string; title: string; unlockedAt: Date | null };

// Les quiz débloqués pour la classe, cours par cours : réussite, élèves qui
// ne l'ont pas tenté, moyenne et élèves bloqués. Chaque quiz ouvre ses
// soumissions pour la classe.
export function ClassQuizProgressTable({
  classId,
  cours,
  quizzes,
}: {
  classId: string;
  cours: {
    id: string;
    title: string;
    thematiques: { id: string; title: string; quiz: OutlineQuiz[] }[];
  }[];
  quizzes: Record<string, ClassQuizProgress>;
}) {
  const rows = cours.flatMap((c) =>
    c.thematiques.flatMap((t) =>
      t.quiz
        .filter((q) => q.unlockedAt !== null && quizzes[q.id])
        .map((q) => ({ quiz: q, thematique: t.title, stats: quizzes[q.id] }))
    )
  );

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun quiz n&apos;est encore débloqué pour cette classe.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Quiz</TableHead>
          <TableHead>Réussi</TableHead>
          <TableHead>Pas tenté</TableHead>
          <TableHead>Moyenne</TableHead>
          <TableHead>Bloqués</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ quiz, thematique, stats }) => (
          <TableRow key={quiz.id}>
            <TableCell className="max-w-sm">
              <Link
                href={`/dashboard/classes/${classId}/quiz/${quiz.id}`}
                className="block truncate font-medium hover:underline hover:underline-offset-4"
              >
                {quiz.title}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {thematique}
              </p>
            </TableCell>
            <TableCell className="tabular-nums">
              {stats.passed}/{stats.students}
            </TableCell>
            <TableCell className="tabular-nums text-muted-foreground">
              {stats.students - stats.attempted}
            </TableCell>
            <TableCell className="tabular-nums text-muted-foreground">
              {stats.averageScore === null
                ? "—"
                : `${Math.round(stats.averageScore)} %`}
            </TableCell>
            <TableCell className="tabular-nums">
              {stats.blocked > 0 ? (
                <span className="text-rose-600">{stats.blocked}</span>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
