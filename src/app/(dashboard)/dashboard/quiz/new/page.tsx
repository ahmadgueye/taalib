import {
  Breadcrumbs,
  thematiqueCrumbs,
} from "@/components/dashboard/breadcrumbs";
import { QuizEditor } from "@/components/dashboard/quiz-editor";
import { getAllThematiques } from "@/lib/db/queries/thematiques";

type Props = {
  searchParams: Promise<{ thematique?: string }>;
};

export default async function NewQuizPage({ searchParams }: Props) {
  const [{ thematique: thematiqueId }, thematiques] = await Promise.all([
    searchParams,
    getAllThematiques(),
  ]);
  const thematiqueOptions = thematiques.map((t) => ({
    id: t.id,
    title: t.title,
    coursTitle: t.cours.title,
  }));
  const parent = thematiques.find((t) => t.id === thematiqueId);

  return (
    <div>
      <Breadcrumbs
        items={[
          ...(parent
            ? thematiqueCrumbs(parent)
            : [{ label: "Quiz", href: "/dashboard/quiz" }]),
          { label: "Nouveau quiz" },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Nouveau quiz
      </h1>
      <div className="mt-6">
        <QuizEditor
          thematiqueOptions={thematiqueOptions}
          defaultThematiqueId={parent?.id}
          initialQuestions={[]}
        />
      </div>
    </div>
  );
}
