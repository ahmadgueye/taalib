"use client";

import {
  EditorFormActions,
  useEditorForm,
} from "@/components/dashboard/use-editor-form";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClass, updateClass } from "@/lib/actions/classes";

export function ClassForm({
  classe,
}: {
  classe?: { id: string; name: string; description: string | null };
}) {
  const action = classe ? updateClass.bind(null, classe.id) : createClass;
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
            defaultValue={classe?.name}
            placeholder="Ex : Arabe niveau 1 — 2026"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            defaultValue={classe?.description ?? ""}
            rows={3}
          />
          <FieldDescription>Facultatif.</FieldDescription>
        </Field>
        <EditorFormActions
          pending={pending}
          dirty={!!classe && dirty}
          error={state?.error}
        >
          {classe ? "Enregistrer" : "Créer"}
        </EditorFormActions>
      </FieldGroup>
      {leaveDialog}
    </form>
  );
}
