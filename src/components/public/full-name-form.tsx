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
import { updateFullNameAction, type ActionState } from "@/lib/actions/auth";

export function FullNameForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateFullNameAction,
    undefined,
  );

  return (
    <form action={formAction} className="max-w-sm">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fullName">Ton nom complet</FieldLabel>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </Field>
        {next && <input type="hidden" name="next" value={next} />}
        {state?.error && <FieldError>{state.error}</FieldError>}
        <SubmitButton>Enregistrer</SubmitButton>
      </FieldGroup>
    </form>
  );
}
