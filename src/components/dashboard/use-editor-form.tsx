"use client";

import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/dashboard/submit-button";
import { useFormLeaveGuard } from "@/components/dashboard/use-leave-guard";
import { FieldError } from "@/components/ui/field";

type EditorState = { error?: string; success?: string } | undefined;

// Un formulaire d'édition du dashboard : il s'envoie sans la réinitialisation
// automatique de React (qui effacerait la saisie quand l'enregistrement est
// refusé), affiche un toast quand il réussit et prévient avant de quitter la
// page avec des modifications non enregistrées. Une création redirige
// toujours depuis l'action.
export function useEditorForm(
  action: (state: EditorState, formData: FormData) => Promise<EditorState>
) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const { formRef, leaveDialog, dirty, markSaved } = useFormLeaveGuard();

  useEffect(() => {
    if (!state?.success) return;
    toast.success(state.success);
    markSaved();
  }, [state, markSaved]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(
      event.currentTarget,
      (event.nativeEvent as SubmitEvent).submitter
    );
    startTransition(() => dispatch(formData));
  }

  return { state, pending, dirty, formRef, onSubmit, leaveDialog };
}

// La barre d'enregistrement, collée en bas de l'écran comme dans l'éditeur
// de quiz : toujours à portée de main dans un long formulaire.
export function EditorFormActions({
  children,
  pending,
  dirty,
  error,
}: {
  children: React.ReactNode;
  pending: boolean;
  dirty: boolean;
  error?: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t bg-background py-3">
      <SubmitButton pending={pending}>{children}</SubmitButton>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        dirty && (
          <span className="text-sm text-muted-foreground">
            Modifications non enregistrées
          </span>
        )
      )}
    </div>
  );
}
