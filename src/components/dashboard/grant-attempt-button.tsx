"use client";

import { useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { grantQuizAttempt } from "@/lib/actions/quiz";

// Une tentative de plus pour un étudiant sur un quiz à tentatives limitées.
export function GrantAttemptButton({
  quizId,
  userId,
}: {
  quizId: string;
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      loading={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await grantQuizAttempt(quizId, userId);
          if (result?.error) toast.error(result.error);
          else toast.success("Tentative accordée.");
        })
      }
    >
      <Plus className="size-4" />
      Accorder une tentative
    </Button>
  );
}
