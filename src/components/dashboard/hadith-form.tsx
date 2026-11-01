"use client";

import { useActionState } from "react";
import Link from "next/link";

import { MarkdownEditorField } from "@/components/dashboard/markdown-editor-field";
import { NarratorMultiSelect } from "@/components/dashboard/narrator-multi-select";
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
import {
  createHadith,
  updateHadith,
  type ActionState,
} from "@/lib/actions/hadiths";

export function HadithForm({
  thematiqueOptions,
  defaultThematiqueId,
  backToThematique,
  narratorOptions,
  hadith,
}: {
  thematiqueOptions: { id: string; title: string; coursTitle: string }[];
  // Ouvert depuis la page d'une thématique : pré-choisie, et on y revient
  // après l'enregistrement.
  defaultThematiqueId?: string;
  backToThematique?: boolean;
  narratorOptions: { id: string; name: string }[];
  hadith?: {
    id: string;
    title: string;
    arabicText: string;
    translationFr: string;
    translationWolof: string | null;
    hadithNarrators: { narrator: { id: string; name: string } }[];
    source: string | null;
    thematiqueId: string;
  };
}) {
  const action = hadith ? updateHadith.bind(null, hadith.id) : createHadith;
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="max-w-lg">
      {backToThematique && (
        <input type="hidden" name="backToThematique" value="1" />
      )}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="thematiqueId">Thématique</FieldLabel>
          <Select
            name="thematiqueId"
            defaultValue={hadith?.thematiqueId ?? defaultThematiqueId}
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
            defaultValue={hadith?.title}
            required
          />
          <FieldDescription>
            Court résumé en français, utilisé aussi pour l&apos;URL.
          </FieldDescription>
        </Field>
        <MarkdownEditorField
          name="arabicText"
          label="Texte arabe"
          defaultValue={hadith?.arabicText}
          dir="rtl"
          lang="ar"
          editorClassName="font-arabic text-right"
          placeholder="النص بالعربية…"
        />
        <MarkdownEditorField
          name="translationFr"
          label="Traduction en français"
          defaultValue={hadith?.translationFr}
          placeholder="Texte en **Markdown**…"
        />
        <MarkdownEditorField
          name="translationWolof"
          label="Texte wolof"
          defaultValue={hadith?.translationWolof}
          placeholder="Texte en **Markdown**…"
          fieldDescription="Facultatif. Markdown supporté : gras, listes, liens, etc."
        />
        <Field>
          <FieldLabel htmlFor="narrator">Rapporteur(s)</FieldLabel>
          <NarratorMultiSelect
            id="narrator"
            name="narrators"
            options={narratorOptions}
            defaultValue={hadith?.hadithNarrators.map((hn) => hn.narrator)}
          />
          <FieldDescription>
            Tapez un nom absent de la liste pour l&apos;ajouter. Les
            rapporteurs se gèrent dans{" "}
            <Link href="/dashboard/rapporteurs" className="underline">
              Rapporteurs
            </Link>
            .
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="source">Source</FieldLabel>
          <Input
            id="source"
            name="source"
            defaultValue={hadith?.source ?? ""}
            placeholder="ex. Sahih al-Bukhari, n°1"
          />
          <FieldDescription>Facultatif.</FieldDescription>
        </Field>
        {state?.error && <FieldError>{state.error}</FieldError>}
        <SubmitButton>{hadith ? "Enregistrer" : "Créer"}</SubmitButton>
      </FieldGroup>
    </form>
  );
}
