"use client";

import {
  EditorFormActions,
  useEditorForm,
} from "@/components/dashboard/use-editor-form";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createNarrator, updateNarrator } from "@/lib/actions/narrators";

export function NarratorForm({
  narrator,
}: {
  narrator?: { id: string; name: string };
}) {
  const action = narrator
    ? updateNarrator.bind(null, narrator.id)
    : createNarrator;
  const { state, pending, dirty, formRef, onSubmit, leaveDialog } =
    useEditorForm(action);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="max-w-lg">
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
        <EditorFormActions
          pending={pending}
          dirty={!!narrator && dirty}
          error={state?.error}
        >
          {narrator ? "Enregistrer" : "Créer"}
        </EditorFormActions>
      </FieldGroup>
      {leaveDialog}
    </form>
  );
}
