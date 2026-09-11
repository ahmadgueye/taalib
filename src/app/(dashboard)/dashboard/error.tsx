"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
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
        Une erreur est survenue
      </h1>
      <p className="max-w-sm text-muted-foreground">
        Le chargement de cette page a échoué. Vous pouvez réessayer.
      </p>
      <Button variant="outline" onClick={() => reset()}>
        Réessayer
      </Button>
    </div>
  );
}
