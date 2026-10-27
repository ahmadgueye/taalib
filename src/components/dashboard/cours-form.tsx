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
  createCours,
  updateCours,
  type ActionState,
} from "@/lib/actions/cours";

const statusOptions = [
  { value: "published", label: "Publié" },
  { value: "coming_soon", label: "Bientôt disponible" },
];

export function CoursForm({
  cours,
}: {
  cours?: {
    id: string;
    title: string;
    arabicTitle: string | null;
    description: string | null;
    status: "published" | "coming_soon";
  };
}) {
  const action = cours ? updateCours.bind(null, cours.id) : createCours;
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
            defaultValue={cours?.title}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="arabicTitle">Nom en arabe</FieldLabel>
          <Input
            id="arabicTitle"
            name="arabicTitle"
            dir="rtl"
            lang="ar"
            placeholder="العقيدة"
            defaultValue={cours?.arabicTitle ?? ""}
          />
          <FieldDescription>
            Facultatif. Affiché en calligraphie sur la carte du cours.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="status">Statut</FieldLabel>
          <Select
            name="status"
            defaultValue={cours?.status ?? "published"}
            items={statusOptions}
            required
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            defaultValue={cours?.description ?? ""}
            rows={3}
          />
          <FieldDescription>Facultatif.</FieldDescription>
        </Field>
        {state?.error && <FieldError>{state.error}</FieldError>}
        <SubmitButton>{cours ? "Enregistrer" : "Créer"}</SubmitButton>
      </FieldGroup>
    </form>
  );
}
