import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { EntityCard } from "@/components/public/entity-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getSuiviCours } from "@/lib/db/queries/progress";

export const metadata: Metadata = {
  title: "Mon compte — Taalib",
  robots: { index: false, follow: false },
};

export default async function ComptePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/compte");

  const suivi = await getSuiviCours(profile.id);

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
        <CardContent>
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
    </div>
  );
}
