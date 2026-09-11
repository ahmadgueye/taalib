"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold">
        Cette page n&apos;a pas pu s&apos;afficher
      </h1>
      <p className="max-w-sm text-muted-foreground">
        Un problème temporaire est survenu. Vous pouvez réessayer ou revenir à
        l&apos;accueil.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => reset()}>
          Réessayer
        </Button>
        <Button render={<Link href="/" />} nativeButton={false}>
          Retour à l&apos;accueil
        </Button>
      </div>
    </div>
  );
}
