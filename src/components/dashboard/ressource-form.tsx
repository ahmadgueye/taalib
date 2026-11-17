"use client";

import { RessourceUrlField } from "@/components/dashboard/ressource-url-field";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createRessource, updateRessource } from "@/lib/actions/ressources";

const statusOptions = [
  { value: "published", label: "Publié" },
  { value: "draft", label: "Brouillon" },
];

export function RessourceForm({
  thematiqueOptions,
  defaultThematiqueId,
  ressource,
}: {
  thematiqueOptions: { id: string; title: string; coursTitle: string }[];
  // Création depuis la page d'une thématique : déjà choisie.
  defaultThematiqueId?: string;
  ressource?: {
    id: string;
    title: string;
    type: "video" | "pdf" | "lien" | "texte";
    url: string | null;
    content?: string | null;
    description: string | null;
    thematiqueId: string;
    status: "draft" | "published";
  };
}) {
  const action = ressource
    ? updateRessource.bind(null, ressource.id)
    : createRessource;
  const { state, pending, dirty, formRef, onSubmit, leaveDialog } =
    useEditorForm(action);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="max-w-lg">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="thematiqueId">Thématique</FieldLabel>
          <Select
            name="thematiqueId"
            defaultValue={ressource?.thematiqueId ?? defaultThematiqueId}
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
          <Input
            id="title"
            name="title"
            defaultValue={ressource?.title}
            required
          />
        </Field>
        <Field>
          <RessourceUrlField
            defaultUrl={ressource?.url ?? undefined}
            defaultType={ressource?.type}
            defaultContent={ressource?.content}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="status">Statut</FieldLabel>
          <Select
            name="status"
            defaultValue={ressource?.status ?? "published"}
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
            defaultValue={ressource?.description ?? ""}
            rows={3}
          />
          <FieldDescription>Facultatif.</FieldDescription>
        </Field>
        <EditorFormActions
          pending={pending}
          dirty={!!ressource && dirty}
          error={state?.error}
        >
          {ressource ? "Enregistrer" : "Créer"}
        </EditorFormActions>
      </FieldGroup>
      {leaveDialog}
    </form>
  );
}
