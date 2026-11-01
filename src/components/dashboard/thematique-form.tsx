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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createThematique,
  updateThematique,
  type ActionState,
} from "@/lib/actions/thematiques";

export function ThematiqueForm({
  coursOptions,
  thematique,
  defaultCoursId,
}: {
  coursOptions: { id: string; title: string }[];
  // Création depuis la page d'un cours : déjà choisi.
  defaultCoursId?: string;
  thematique?: {
    id: string;
    title: string;
    description: string | null;
    coursId: string;
  };
}) {
  const action = thematique
    ? updateThematique.bind(null, thematique.id)
    : createThematique;
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="max-w-lg">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="coursId">Cours</FieldLabel>
          <Select
            name="coursId"
            defaultValue={thematique?.coursId ?? defaultCoursId}
            items={coursOptions.map((c) => ({ value: c.id, label: c.title }))}
            required
          >
            <SelectTrigger id="coursId" className="w-full">
              <SelectValue placeholder="Choisir un cours" />
            </SelectTrigger>
            <SelectContent>
              {coursOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="title">Titre</FieldLabel>
          <Input
            id="title"
            name="title"
            defaultValue={thematique?.title}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            defaultValue={thematique?.description ?? ""}
            rows={3}
          />
          <FieldDescription>Facultatif.</FieldDescription>
        </Field>
        {state?.error && <FieldError>{state.error}</FieldError>}
        <SubmitButton>{thematique ? "Enregistrer" : "Créer"}</SubmitButton>
      </FieldGroup>
    </form>
  );
}
