import { notFound } from "next/navigation";

import {
  Breadcrumbs,
  thematiqueCrumbs,
} from "@/components/dashboard/breadcrumbs";
import { QuizForm } from "@/components/dashboard/quiz-form";
import { getQuizById } from "@/lib/db/queries/quiz";
import { getAllThematiques } from "@/lib/db/queries/thematiques";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditQuizPage({ params }: Props) {
  const { id } = await params;
  const [quiz, thematiques] = await Promise.all([
    getQuizById(id),
    getAllThematiques(),
  ]);

  if (!quiz) notFound();

  const thematiqueOptions = thematiques.map((t) => ({
    id: t.id,
    title: t.title,
    coursTitle: t.cours.title,
  }));
  const parent = thematiques.find((t) => t.id === quiz.thematiqueId);

  return (
    <div>
      <Breadcrumbs
        items={[
          ...(parent
            ? thematiqueCrumbs(parent)
            : [{ label: "Quiz", href: "/dashboard/quiz" }]),
          { label: quiz.title },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Modifier le quiz
      </h1>
      <div className="mt-6">
        <QuizForm thematiqueOptions={thematiqueOptions} quiz={quiz} />
      </div>
    </div>
  );
}
