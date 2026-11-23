import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldSeparator } from "@/components/ui/field";
import { GoogleLoginButton } from "@/components/public/google-login-button";
import { MagicLinkForm } from "@/components/public/magic-link-form";

export const metadata: Metadata = {
  title: "Connexion — Taalib",
  description:
    "Connecte-toi ou inscris-toi sur Taalib, la plateforme de cours du programme Bayān.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      {/* Plus de lien vers l'accueil : sans compte, il renvoie ici. */}
      <p
        lang="ar"
        className="mb-3 flex items-center gap-2 font-logo-arabic text-2xl font-bold tracking-tight"
      >
        طالب
      </p>
      <p className="mb-8 max-w-sm text-center text-sm text-muted-foreground">
        La plateforme d&apos;apprentissage du programme{" "}
        <span className="font-semibold text-foreground">Bayān</span> : tes
        cours, tes ressources et tes quiz, au rythme de ta classe.
      </p>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading">Connexion ou inscription</CardTitle>
          <CardDescription>
            Première fois ? Ton compte est créé à la connexion.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GoogleLoginButton next={next} />
          <FieldSeparator>ou</FieldSeparator>
          <MagicLinkForm next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
