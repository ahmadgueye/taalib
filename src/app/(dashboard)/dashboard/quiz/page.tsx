import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QuizTable } from "@/components/dashboard/quiz-table";
import { getAllQuiz } from "@/lib/db/queries/quiz";

export default async function DashboardQuizPage() {
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
        <QuizTable data={quizList} />
      </div>
    </div>
  );
}
