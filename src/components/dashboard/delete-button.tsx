"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2, type LucideIcon } from "lucide-react";
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

export function DeleteButton({
  action,
  itemLabel,
  title,
  description = "Cette action est irréversible.",
  confirmLabel = "Supprimer",
  icon: Icon = Trash2,
  destructive = true,
  successMessage,
}: {
  action: () => Promise<void>;
  itemLabel: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  // Pour réutiliser la confirmation sur une action non destructive.
  icon?: LucideIcon;
  destructive?: boolean;
  // Toast une fois l'action faite ; par défaut seulement pour une suppression.
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await action();
      } catch {
        toast.error("L'opération a échoué. Réessaie.");
        return;
      }
      setOpen(false);
      const message =
        successMessage ?? (destructive ? `Supprimé : « ${itemLabel} ».` : null);
      if (message) toast.success(message);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              title?.replace(/\s*\?$/, "") ?? `Supprimer « ${itemLabel} »`
            }
          />
        }
      >
        <Icon className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title ?? `Supprimer « ${itemLabel} » ?`}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {confirmLabel}…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
