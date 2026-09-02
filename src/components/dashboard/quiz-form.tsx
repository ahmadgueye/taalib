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
import { createQuiz, updateQuiz, type ActionState } from "@/lib/actions/quiz";

const statusOptions = [
  { value: "published", label: "Publié" },
  { value: "draft", label: "Brouillon" },
];

export function QuizForm({
  thematiqueOptions,
  quiz,
}: {
  thematiqueOptions: { id: string; title: string; coursTitle: string }[];
  quiz?: {
    id: string;
    title: string;
    description: string | null;
    thematiqueId: string;
    status: "draft" | "published";
  };
}) {
  const action = quiz ? updateQuiz.bind(null, quiz.id) : createQuiz;
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="max-w-lg">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="thematiqueId">Thématique</FieldLabel>
          <Select
            name="thematiqueId"
            defaultValue={quiz?.thematiqueId}
            items={thematiqueOptions.map((t) => ({
              value: t.id,
              label: `${t.coursTitle} · ${t.title}`,
            }))}
            required
          >
            <SelectTrigger id="thematiqueId" className="w-full">
              <SelectValue placeholder="Choisir une thématique" />
            </SelectTrigger>
            <SelectContent>
              {thematiqueOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.coursTitle} · {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="title">Titre</FieldLabel>
          <Input id="title" name="title" defaultValue={quiz?.title} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            defaultValue={quiz?.description ?? ""}
            rows={3}
          />
          <FieldDescription>Facultatif.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="status">Statut</FieldLabel>
          <Select
            name="status"
            defaultValue={quiz?.status ?? "published"}
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
        {state?.error && <FieldError>{state.error}</FieldError>}
        <SubmitButton>
          {quiz ? "Enregistrer" : "Créer et ajouter des questions"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
