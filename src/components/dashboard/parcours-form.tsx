"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/dashboard/submit-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createParcours,
  updateParcours,
  type ActionState,
} from "@/lib/actions/parcours";

export function ParcoursForm({
  parcours,
}: {
  parcours?: {
    id: string;
    title: string;
    description: string | null;
  };
}) {
  const action = parcours
    ? updateParcours.bind(null, parcours.id)
    : createParcours;
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="max-w-lg">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="title">Titre</FieldLabel>
          <Input
            id="title"
            name="title"
            defaultValue={parcours?.title}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            defaultValue={parcours?.description ?? ""}
            rows={3}
          />
          <FieldDescription>
            Affichée en intro du parcours sur la page d&apos;accueil.
          </FieldDescription>
        </Field>
        {state?.error && <FieldError>{state.error}</FieldError>}
        <SubmitButton>{parcours ? "Enregistrer" : "Créer"}</SubmitButton>
      </FieldGroup>
    </form>
  );
}
