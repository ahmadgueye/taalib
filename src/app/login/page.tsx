import type { Metadata } from "next";
import Link from "next/link";

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
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <Link
        href="/"
        lang="ar"
        className="flex mb-8 items-center gap-2 font-logo-arabic text-2xl font-bold tracking-tight"
      >
        {/* <BookOpen className="size-5" /> */}
        طالب
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading">Connexion</CardTitle>
          <CardDescription>
            Connecte-toi pour suivre ta progression dans les cours.
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
