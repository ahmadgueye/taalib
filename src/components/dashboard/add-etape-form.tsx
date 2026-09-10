"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/dashboard/submit-button";
import { ThematiqueMultiSelect } from "@/components/dashboard/thematique-multi-select";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { addEtapes, type ActionState } from "@/lib/actions/parcours";

export function AddEtapeForm({
  parcoursId,
  thematiqueOptions,
}: {
  parcoursId: string;
  thematiqueOptions: { id: string; title: string; coursTitle: string }[];
}) {
  const action = addEtapes.bind(null, parcoursId);
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined
  );

  if (thematiqueOptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Toutes les thématiques existantes font déjà partie de ce parcours.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex items-start gap-2">
      <FieldGroup className="flex-1">
        <Field>
          <ThematiqueMultiSelect
            name="thematiqueIds"
            options={thematiqueOptions}
          />
          {state?.error && <FieldError>{state.error}</FieldError>}
        </Field>
      </FieldGroup>
      <SubmitButton>Ajouter</SubmitButton>
    </form>
  );
}
