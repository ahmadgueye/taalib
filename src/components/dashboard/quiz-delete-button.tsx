"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  deleteQuiz,
  getQuizDeletionImpact,
  unpublishQuiz,
} from "@/lib/actions/quiz";

type Impact = Awaited<ReturnType<typeof getQuizDeletionImpact>> | null;

function plural(n: number, word: string) {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

function describe(impact: Impact | undefined) {
  if (impact === undefined) return "Vérification des tentatives…";
  if (impact === null) {
    return "Les tentatives n'ont pas pu être vérifiées. Supprimer le quiz efface celles des étudiants ; cette action est irréversible.";
  }
  const { attempts, students, status } = impact;
  if (attempts === 0) {
    return "Aucun étudiant n'a encore tenté ce quiz. Cette action est irréversible.";
  }
  const lost =
    attempts > 1
      ? `${attempts} tentatives de ${plural(students, "étudiant")} seront supprimées définitivement, avec leurs réponses.`
      : "La tentative d'un étudiant sera supprimée définitivement, avec ses réponses.";
  const hint =
    status === "published"
      ? " Pour retirer le quiz sans perdre ces résultats, passe-le plutôt en brouillon."
      : "";
  return lost + hint;
}

// Supprimer un quiz efface les tentatives des étudiants : la confirmation
// dit combien, et propose de le passer en brouillon pour les garder.
export function QuizDeleteButton({
  quizId,
  title,
}: {
  quizId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<Impact | undefined>();
  const [isPending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setImpact(undefined);
    getQuizDeletionImpact(quizId).then(setImpact, () => setImpact(null));
  }

  function run(action: () => Promise<void>, message: string) {
    startTransition(async () => {
      try {
        await action();
      } catch {
        toast.error("L'opération a échoué. Réessaie.");
        return;
      }
      setOpen(false);
      toast.success(message);
    });
  }

  const attempts = impact?.attempts ?? 0;
  const canUnpublish = attempts > 0 && impact?.status === "published";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Supprimer « ${title} »`}
          />
        }
      >
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      {/* Plus large que d'habitude : trois boutons quand le quiz a des
          tentatives. La variante doit être la même que celle du composant
          pour la remplacer. */}
      <AlertDialogContent className="data-[size=default]:sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {title} » ?</AlertDialogTitle>
          <AlertDialogDescription>{describe(impact)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-wrap">
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          {canUnpublish && (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(
                  () => unpublishQuiz(quizId),
                  `« ${title} » est passé en brouillon.`
                )
              }
            >
              Passer en brouillon
            </Button>
          )}
          <Button
            variant="destructive"
            disabled={isPending || impact === undefined}
            onClick={() =>
              run(() => deleteQuiz(quizId), `Supprimé : « ${title} ».`)
            }
          >
            {attempts > 0 ? "Supprimer quand même" : "Supprimer"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
