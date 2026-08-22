import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleLoginButton } from "@/components/public/google-login-button";

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
        className="mb-8 font-heading text-lg font-semibold tracking-tight"
      >
        Taalib
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading">Connexion</CardTitle>
          <CardDescription>
            Connecte-toi pour suivre ta progression dans les cours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleLoginButton next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
