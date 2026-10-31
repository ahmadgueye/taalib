"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/dashboard/submit-button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  createNarrator,
  updateNarrator,
  type ActionState,
} from "@/lib/actions/narrators";

export function NarratorForm({
  narrator,
}: {
  narrator?: { id: string; name: string };
}) {
  const action = narrator
    ? updateNarrator.bind(null, narrator.id)
    : createNarrator;
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="max-w-lg">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Nom</FieldLabel>
          <Input
            id="name"
            name="name"
            defaultValue={narrator?.name}
            placeholder="ex. Al-Bukhârî"
            required
          />
        </Field>
        {state?.error && <FieldError>{state.error}</FieldError>}
        <SubmitButton>{narrator ? "Enregistrer" : "Créer"}</SubmitButton>
      </FieldGroup>
    </form>
  );
}
