import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/public/profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { isProfileComplete, profileFormDefaults } from "@/lib/profile-info";

export const metadata: Metadata = {
  title: "Bienvenue — Taalib",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

// Première étape après l'inscription : l'étudiant renseigne ses
// informations, puis saisit le code de sa classe (voir updateProfileAction).
// Un étudiant inscrit avant l'ajout de ces champs y est renvoyé aussi.
export default async function BienvenuePage({ searchParams }: Props) {
  const { next } = await searchParams;
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent("/bienvenue")}`);
  if (isProfileComplete(profile)) redirect(target);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <p
        lang="ar"
        className="mb-8 font-logo-arabic text-2xl font-bold tracking-tight"
      >
        طالب
      </p>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="font-heading">Bienvenue sur Taalib</CardTitle>
          <CardDescription>
            {profile.fullName
              ? "Complète ton profil pour continuer."
              : profile.role === "viewer"
                ? "Présente-toi avant d'accéder à tes cours."
                : "Présente-toi pour continuer."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaults={profileFormDefaults(profile)}
            next={target}
            onboarding
            staff={profile.role !== "viewer"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
