"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/dashboard/submit-button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addEtape, type ActionState } from "@/lib/actions/parcours";

export function AddEtapeForm({
  parcoursId,
  coursOptions,
}: {
  parcoursId: string;
  coursOptions: { id: string; title: string }[];
}) {
  const action = addEtape.bind(null, parcoursId);
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined
  );

  if (coursOptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tous les cours existants font déjà partie de ce parcours.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex items-start gap-2">
      <FieldGroup className="flex-1">
        <Field>
          <Select
            name="coursId"
            items={coursOptions.map((c) => ({ value: c.id, label: c.title }))}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir un cours à ajouter" />
            </SelectTrigger>
            <SelectContent>
              {coursOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.error && <FieldError>{state.error}</FieldError>}
        </Field>
      </FieldGroup>
      <SubmitButton>Ajouter</SubmitButton>
    </form>
  );
}
