import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { QuizSubmissionsTable } from "@/components/dashboard/quiz-submissions-table";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentProfile } from "@/lib/auth/get-session";
import {
  getClassById,
  getClassCoursOutline,
  getClassMembers,
} from "@/lib/db/queries/classes";
import {
  getExtraAttempts,
  getQuizQuestionStats,
  getQuizSubmissionStats,
} from "@/lib/db/queries/quiz-tentatives";
import { attemptsLeft, isPassing } from "@/lib/quiz-attempts";

type Props = {
  params: Promise<{ id: string; quizId: string }>;
};

// Les soumissions d'un quiz pour une classe : ses étudiants seulement, y
// compris ceux qui ne l'ont pas encore tenté, et la réussite de la classe
// question par question.
export default async function ClassQuizPage({ params }: Props) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const { id, quizId } = await params;
  const [classe, outline, members] = await Promise.all([
    getClassById(id),
    getClassCoursOutline(id),
    getClassMembers(id),
  ]);
  if (!classe) notFound();

  const found = outline
    .flatMap((c) =>
      c.thematiques.flatMap((t) =>
        t.quiz.map((q) => ({ quiz: q, thematique: t }))
      )
    )
    .find((entry) => entry.quiz.id === quizId);
  const unlockedAt = found?.quiz.unlockedAt;
  if (!found || !unlockedAt) notFound();
  const { quiz, thematique } = found;

  // Comme pour le suivi : un ancien élève ne compte que si le quiz a été
  // débloqué avant son départ.
  const students = members.filter(
    (m) => m.leftAt === null || unlockedAt <= m.leftAt
  );
  const userIds = students.map((s) => s.userId);
  const [submissions, questionStats, extras] = await Promise.all([
    getQuizSubmissionStats(quizId, userIds),
    getQuizQuestionStats(quizId, userIds),
    getExtraAttempts(quizId),
  ]);

  const attemptedIds = new Set(submissions.students.map((s) => s.user.id));
  const notAttempted = students
    .filter((s) => !attemptedIds.has(s.userId))
    .map((s) => ({ id: s.userId, name: s.fullName ?? s.email }));
  const passed = submissions.students.filter((s) =>
    isPassing(s.bestScore, s.bestTotal, quiz.passingScore)
  );
  const blocked = submissions.students.filter(
    (s) =>
      !isPassing(s.bestScore, s.bestTotal, quiz.passingScore) &&
      attemptsLeft(
        quiz.maxAttempts,
        extras[s.user.id] ?? 0,
        s.attemptsCount
      ) === 0
  );
  const average =
    submissions.students.length === 0
      ? null
      : (submissions.students.reduce(
          (sum, s) => sum + s.bestScore / s.bestTotal,
          0
        ) /
          submissions.students.length) *
        100;

  const stats = [
    { label: "Réussi", value: `${passed.length}/${students.length}` },
    { label: "Pas tenté", value: notAttempted.length },
    {
      label: "Moyenne",
      value: average === null ? "—" : `${Math.round(average)} %`,
    },
    { label: "Bloqués", value: blocked.length, warning: blocked.length > 0 },
  ];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Classes", href: "/dashboard/classes" },
          {
            label: classe.name,
            href: `/dashboard/classes/${classe.id}`,
          },
          { label: quiz.title },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {quiz.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {thematique.title} · seuil de réussite : {quiz.passingScore} %
        {quiz.maxAttempts !== null &&
          ` · ${quiz.maxAttempts} tentative${quiz.maxAttempts > 1 ? "s" : ""} par étudiant`}
        {" · "}
        <Link
          href={`/dashboard/quiz/${quiz.id}/soumissions`}
          className="underline underline-offset-4 hover:text-foreground"
        >
          toutes les soumissions
        </Link>
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle
                className={
                  s.warning
                    ? "font-heading text-3xl text-rose-600"
                    : "font-heading text-3xl"
                }
              >
                {s.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 font-heading text-lg font-semibold">Étudiants</h2>
      {students.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Aucun étudiant dans cette classe.
        </p>
      ) : (
        <QuizSubmissionsTable
          quizId={quiz.id}
          students={submissions.students}
          notAttempted={notAttempted}
          passingScore={quiz.passingScore}
          maxAttempts={quiz.maxAttempts}
          extras={extras}
        />
      )}

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
                q.totalCount === 0
                  ? null
                  : (q.correctCount / q.totalCount) * 100;
              return (
                <TableRow key={q.questionId}>
                  <TableCell className="max-w-md truncate" title={q.prompt}>
                    {q.prompt}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {percent === null
                      ? "Aucune tentative"
                      : `${q.correctCount}/${q.totalCount} (${Math.round(percent)} %)`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
