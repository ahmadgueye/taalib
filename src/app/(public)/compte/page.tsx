import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { EntityCard } from "@/components/public/entity-card";
import { FullNameForm } from "@/components/public/full-name-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getSuiviCours } from "@/lib/db/queries/progress";
import { getQuizAttemptsSummary } from "@/lib/db/queries/quiz-tentatives";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mon compte — Taalib",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function ComptePage({ searchParams }: Props) {
  const { next } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/compte");

  const suivi = await getSuiviCours(profile.id, await getContentAccess());
  const quizAttempts = await getQuizAttemptsSummary(profile.id);

  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Mon compte
      </h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-heading">
            {profile.fullName ?? "Utilisateur"}
          </CardTitle>
          <CardDescription>{profile.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {!profile.fullName && (
            <div>
              <p className="mb-3 text-sm text-muted-foreground">
                Ajoute ton nom pour compléter ton profil.
              </p>
              <FullNameForm next={next} />
            </div>
          )}
          <SignOutButton />
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <h2 className="font-heading text-xl font-semibold">Cours suivis</h2>
      {suivi.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Tu n&apos;as pas encore commencé de cours. Explore les{" "}
          <Link href="/cours" className="underline underline-offset-2">
            cours disponibles
          </Link>{" "}
          pour démarrer ta progression.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {suivi.map(({ cours, completedCount, totalRessources, progress }) => (
            <EntityCard
              key={cours.id}
              href={`/cours/${cours.slug}`}
              title={cours.title}
              description={`${completedCount}/${totalRessources} ressources terminées`}
              progress={progress}
            />
          ))}
        </div>
      )}

      <Separator className="my-8" />

      <h2 className="font-heading text-xl font-semibold">Quiz</h2>
      {quizAttempts.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Tu n&apos;as pas encore passé de quiz.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {quizAttempts.map(
            ({ quiz, bestScore, bestTotal, attemptsCount }) => {
              const passed =
                (bestScore / bestTotal) * 100 >= quiz.passingScore;
              return (
                <Link
                  key={quiz.id}
                  href={`/quiz/${quiz.id}/historique`}
                  className="flex items-center justify-between gap-2 border p-4 transition-colors hover:bg-muted"
                >
                  <div>
                    <span className="font-medium">{quiz.title}</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {quiz.thematique.title} · {attemptsCount} tentative
                      {attemptsCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      passed
                        ? "bg-emerald-600 text-white dark:bg-emerald-500"
                        : "bg-destructive text-white"
                    )}
                  >
                    {bestScore}/{bestTotal}
                  </Badge>
                </Link>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
