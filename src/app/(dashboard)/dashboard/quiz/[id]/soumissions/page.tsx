import { notFound } from "next/navigation";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumbs,
  thematiqueCrumbs,
} from "@/components/dashboard/breadcrumbs";
import { QuizSubmissionsTable } from "@/components/dashboard/quiz-submissions-table";
import { getQuizWithThematique } from "@/lib/db/queries/quiz";
import {
  getQuizQuestionStats,
  getQuizSubmissionStats,
} from "@/lib/db/queries/quiz-tentatives";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function QuizSoumissionsPage({ params }: Props) {
  const { id } = await params;
  const quiz = await getQuizWithThematique(id);
  if (!quiz) notFound();

  const [
    { tentatives, attemptsCount, uniqueUsersCount, averagePercent, students },
    questionStats,
  ] = await Promise.all([getQuizSubmissionStats(id), getQuizQuestionStats(id)]);

  const passRate =
    attemptsCount === 0
      ? null
      : (tentatives.filter(
          (t) => (t.score / t.totalQuestions) * 100 >= quiz.passingScore
        ).length /
          attemptsCount) *
        100;

  const stats = [
    { label: "Tentatives", value: attemptsCount },
    { label: "Étudiants", value: uniqueUsersCount },
    {
      label: "Score moyen",
      value: averagePercent === null ? "—" : `${Math.round(averagePercent)}%`,
    },
    {
      label: "Taux de réussite",
      value: passRate === null ? "—" : `${Math.round(passRate)}%`,
    },
  ];

  return (
    <div>
      <Breadcrumbs
        items={[
          ...thematiqueCrumbs(quiz.thematique),
          {
            label: quiz.title,
            href: `/dashboard/quiz/${quiz.id}/questions`,
          },
          { label: "Soumissions" },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Soumissions — {quiz.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Seuil de réussite : {quiz.passingScore}%.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="font-heading text-3xl">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 font-heading text-lg font-semibold">
        Réussite par question
      </h2>
      {questionStats.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Ce quiz n&apos;a aucune question.
        </p>
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Réussite</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questionStats.map((q) => {
              const percent =
                q.totalCount === 0 ? null : (q.correctCount / q.totalCount) * 100;
              return (
                <TableRow key={q.questionId}>
                  <TableCell className="max-w-md truncate" title={q.prompt}>
                    {q.prompt}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {percent === null
                      ? "Aucune tentative"
                      : `${q.correctCount}/${q.totalCount} (${Math.round(percent)}%)`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <h2 className="mt-10 font-heading text-lg font-semibold">Étudiants</h2>
      {students.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Aucune tentative pour ce quiz.
        </p>
      ) : (
        <QuizSubmissionsTable students={students} passingScore={quiz.passingScore} />
      )}
    </div>
  );
}
