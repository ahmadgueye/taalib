import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QuizTable } from "@/components/dashboard/quiz-table";
import { getAllQuiz } from "@/lib/db/queries/quiz";
import { type RessourceStatus } from "@/lib/ressource-status";

const statuses: RessourceStatus[] = ["draft", "published"];

type Props = {
  searchParams: Promise<{ statut?: string }>;
};

export default async function DashboardQuizPage({ searchParams }: Props) {
  const { statut } = await searchParams;
  const initialStatus = statuses.find((s) => s === statut) ?? "all";
  const quizList = await getAllQuiz();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Quiz
        </h1>
        <Button render={<Link href="/dashboard/quiz/new" />} nativeButton={false}>
          <Plus className="size-4" />
          Nouveau quiz
        </Button>
      </div>

      <div className="mt-6">
        <QuizTable data={quizList} initialStatus={initialStatus} />
      </div>
    </div>
  );
}
