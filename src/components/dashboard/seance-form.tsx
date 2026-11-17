"use client";

import { useState } from "react";

import { MarkdownEditorField } from "@/components/dashboard/markdown-editor-field";
import {
  EditorFormActions,
  useEditorForm,
} from "@/components/dashboard/use-editor-form";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createSeance, updateSeance } from "@/lib/actions/seances";
import { cn } from "@/lib/utils";

const typeLabels = {
  video: "Vidéo",
  pdf: "PDF",
  lien: "Lien",
  texte: "Texte",
};

export function SeanceForm({
  thematiqueOptions,
  ressourceOptions,
  seance,
  linkedThematiqueIds = [],
  linkedRessourceIds = [],
}: {
  thematiqueOptions: { id: string; title: string; coursTitle: string }[];
  ressourceOptions: {
    id: string;
    title: string;
    type: "video" | "pdf" | "lien" | "texte";
    coursTitle: string;
    thematiqueTitle: string;
  }[];
  seance?: {
    id: string;
    title: string;
    sessionDate: string | null;
    summary: string | null;
  };
  linkedThematiqueIds?: string[];
  linkedRessourceIds?: string[];
}) {
  const action = seance
    ? updateSeance.bind(null, seance.id)
    : createSeance;
  const { state, pending, dirty, formRef, onSubmit, leaveDialog } =
    useEditorForm(action);

  const [thematiqueSearch, setThematiqueSearch] = useState("");
  const [ressourceSearch, setRessourceSearch] = useState("");

  return (
    <form ref={formRef} onSubmit={onSubmit} className="max-w-lg">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="title">Titre</FieldLabel>
          <Input
            id="title"
            name="title"
            defaultValue={seance?.title}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="sessionDate">Date</FieldLabel>
          <Input
            id="sessionDate"
            name="sessionDate"
            type="date"
            defaultValue={seance?.sessionDate ?? ""}
          />
          <FieldDescription>Facultatif.</FieldDescription>
        </Field>
        <MarkdownEditorField
          name="summary"
          label="Résumé de la séance"
          defaultValue={seance?.summary}
          placeholder="Résumé en **Markdown**…"
          fieldDescription="Facultatif. Markdown supporté : **gras**, listes (- item), liens [texte](url)."
        />

        <Field>
          <FieldLabel>Thématiques abordées</FieldLabel>
          {thematiqueOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune thématique disponible.
            </p>
          ) : (
            <>
              <Input
                placeholder="Rechercher une thématique…"
                value={thematiqueSearch}
                onChange={(e) => setThematiqueSearch(e.target.value)}
              />
              <div className="max-h-48 space-y-2 overflow-y-auto border p-3">
                {thematiqueOptions.map((t) => {
                  const label = `${t.coursTitle} · ${t.title}`;
                  const matches = label
                    .toLowerCase()
                    .includes(thematiqueSearch.trim().toLowerCase());
                  return (
                    <label
                      key={t.id}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        !matches && "hidden"
                      )}
                    >
                      <Checkbox
                        name="thematiqueIds"
                        value={t.id}
                        defaultChecked={linkedThematiqueIds.includes(t.id)}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </Field>

        <Field>
          <FieldLabel>Ressources associées</FieldLabel>
          {ressourceOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune ressource disponible.
            </p>
          ) : (
            <>
              <Input
                placeholder="Rechercher une ressource…"
                value={ressourceSearch}
                onChange={(e) => setRessourceSearch(e.target.value)}
              />
              <div className="max-h-48 space-y-2 overflow-y-auto border p-3">
                {ressourceOptions.map((r) => {
                  const label = `${r.coursTitle} · ${r.thematiqueTitle} · ${r.title}`;
                  const matches = label
                    .toLowerCase()
                    .includes(ressourceSearch.trim().toLowerCase());
                  return (
                    <label
                      key={r.id}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        !matches && "hidden"
                      )}
                    >
                      <Checkbox
                        name="ressourceIds"
                        value={r.id}
                        defaultChecked={linkedRessourceIds.includes(r.id)}
                      />
                      <span className="flex-1">{label}</span>
                      <Badge variant="secondary" className="shrink-0">
                        {typeLabels[r.type]}
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </Field>

        <EditorFormActions
          pending={pending}
          dirty={!!seance && dirty}
          error={state?.error}
        >
          {seance ? "Enregistrer" : "Créer"}
        </EditorFormActions>
      </FieldGroup>
      {leaveDialog}
    </form>
  );
}
