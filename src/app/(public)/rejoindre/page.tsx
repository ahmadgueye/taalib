import type { Metadata } from "next";
import Link from "next/link";

import { InviteCodeForm } from "@/components/public/invite-code-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Rejoindre une classe — Taalib",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ bienvenue?: string }>;
};

// Deuxième étape de l'inscription (`?bienvenue=1`, après /bienvenue), et
// page ouverte à tout moment depuis l'accueil d'un étudiant sans classe.
// L'étape n'est pas bloquante : sans code, l'accueil le lui redemande.
export default async function RejoindrePage({ searchParams }: Props) {
  const { bienvenue } = await searchParams;
  const onboarding = bienvenue === "1";

  return (
    <div className="mx-auto w-full max-w-sm py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">
            {onboarding ? "Dernière étape : ta classe" : "Rejoindre une classe"}
          </CardTitle>
          <CardDescription>
            Saisis le code d&apos;invitation donné par ton enseignant
            {onboarding ? " pour accéder à tes cours." : "."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <InviteCodeForm />
          {onboarding && (
            <Link
              href="/"
              className="w-fit text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Je n&apos;ai pas encore de code
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
