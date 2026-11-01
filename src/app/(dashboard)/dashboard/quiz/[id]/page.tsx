import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3 } from "lucide-react";

import {
  Breadcrumbs,
  thematiqueCrumbs,
} from "@/components/dashboard/breadcrumbs";
import { QuizEditor } from "@/components/dashboard/quiz-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getQuizWithQuestions } from "@/lib/db/queries/quiz";
import { getAllThematiques } from "@/lib/db/queries/thematiques";
import { toQuestionDrafts } from "@/lib/quiz-drafts";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
};

// Une seule page pour un quiz, en deux onglets (questions, réglages)
// enregistrés ensemble.
export default async function QuizPage({ params, searchParams }: Props) {
  const [{ id }, { onglet }] = await Promise.all([params, searchParams]);
  const [quiz, thematiques] = await Promise.all([
    getQuizWithQuestions(id),
    getAllThematiques(),
  ]);

  if (!quiz) notFound();

  const thematiqueOptions = thematiques.map((t) => ({
    id: t.id,
    title: t.title,
    coursTitle: t.cours.title,
  }));

  return (
    <div>
      <Breadcrumbs
        items={[...thematiqueCrumbs(quiz.thematique), { label: quiz.title }]}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {quiz.title}
          </h1>
          {quiz.status === "draft" && (
            <Badge variant="outline">Brouillon</Badge>
          )}
        </div>
        <Button
          render={<Link href={`/dashboard/quiz/${quiz.id}/soumissions`} />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          <BarChart3 className="size-4" />
          Soumissions
        </Button>
      </div>
      <div className="mt-6">
        <QuizEditor
          quiz={quiz}
          thematiqueOptions={thematiqueOptions}
          initialQuestions={toQuestionDrafts(quiz.questions)}
          initialTab={onglet}
        />
      </div>
    </div>
  );
}
