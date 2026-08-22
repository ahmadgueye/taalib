"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toggleRessourceCompletion } from "@/lib/actions/progress";
import { cn } from "@/lib/utils";

// Mount a new instance (via `key`) whenever the server-confirmed `completed`
// value changes, instead of syncing it through an effect.
export function MarkCompleteButton({
  ressourceId,
  completed,
}: {
  ressourceId: string;
  completed: boolean;
}) {
  const pathname = usePathname();
  const [optimisticCompleted, setOptimisticCompleted] = useState(completed);
  const [isPending, startTransition] = useTransition();

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const next = !optimisticCompleted;
    setOptimisticCompleted(next);
    startTransition(async () => {
      const result = await toggleRessourceCompletion(ressourceId, pathname);
      if (result?.error) {
        setOptimisticCompleted(!next);
      }
    });
  }

  return (
    <Button
      type="button"
      variant={optimisticCompleted ? "default" : "outline"}
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      className={cn(
        optimisticCompleted &&
          "bg-emerald-600 text-white hover:bg-emerald-600/85 dark:bg-emerald-500 dark:hover:bg-emerald-500/85"
      )}
    >
      <Check />
      {optimisticCompleted ? "Terminé" : "Marquer comme terminé"}
    </Button>
  );
}
