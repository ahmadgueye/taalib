import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { QuizListView } from "@/components/public/quiz-list-view";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getStudentQuizzes } from "@/lib/db/queries/student-quizzes";
import { parseQuizListFilter } from "@/lib/quiz-list";

export const metadata: Metadata = {
  title: "Quiz — Taalib",
};

type Props = {
  searchParams: Promise<{ filtre?: string }>;
};

// Tous les quiz débloqués de l'étudiant, filtrés par où il en est : ceux à
// faire d'abord (onglet par défaut), puis réussis et échoués.
export default async function QuizListPage({ searchParams }: Props) {
  const { filtre } = await searchParams;
  const filter = parseQuizListFilter(filtre);

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/quiz");

  const access = await getContentAccess();
  const quizzes = await getStudentQuizzes(profile.id, access);

  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Quiz
      </h1>
      <p className="mt-2 text-muted-foreground">
        Tous les quiz de tes cours, pour savoir lesquels t&apos;attendent.
      </p>

      {quizzes.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Aucun quiz ne t&apos;est encore ouvert. Ils apparaîtront ici au fil
          des cours de ta classe.
          {!access.all && !access.inAnyClass && (
            <>
              {" "}
              <Link href="/rejoindre" className="underline underline-offset-2">
                Rejoindre une classe
              </Link>
            </>
          )}
        </p>
      ) : (
        <QuizListView quizzes={quizzes} initialFilter={filter} />
      )}
    </div>
  );
}
