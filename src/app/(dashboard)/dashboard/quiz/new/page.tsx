import { QuizForm } from "@/components/dashboard/quiz-form";
import { getAllThematiques } from "@/lib/db/queries/thematiques";

export default async function NewQuizPage() {
  const thematiques = await getAllThematiques();
  const thematiqueOptions = thematiques.map((t) => ({
    id: t.id,
    title: t.title,
    coursTitle: t.cours.title,
  }));

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Nouveau quiz
      </h1>
      <div className="mt-6">
        <QuizForm thematiqueOptions={thematiqueOptions} />
      </div>
    </div>
  );
}
