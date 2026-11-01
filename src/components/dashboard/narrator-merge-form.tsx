"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mergeNarrator, type ActionState } from "@/lib/actions/narrators";

function MergeButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Fusion…" : "Fusionner"}
    </Button>
  );
}

export function NarratorMergeForm({
  narrator,
  options,
}: {
  narrator: { id: string; name: string };
  options: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    mergeNarrator.bind(null, narrator.id),
    undefined
  );

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <Select
            name="targetId"
            items={options.map((o) => ({ value: o.id, label: o.name }))}
            required
          >
            <SelectTrigger className="w-full" aria-label="Rapporteur à conserver">
              <SelectValue placeholder="Rapporteur à conserver" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {state?.error && <FieldError>{state.error}</FieldError>}
        <MergeButton />
      </FieldGroup>
    </form>
  );
}
