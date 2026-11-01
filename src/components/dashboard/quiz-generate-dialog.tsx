"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  generateQuizQuestions,
  listQuizSources,
} from "@/lib/actions/quiz-generation";
import {
  ANTHROPIC_BILLING_URL,
  estimateGenerationCost,
  formatCost,
} from "@/lib/quiz-generation-cost";
import type { ImportedQuestion } from "@/lib/quiz-import";

type Source = Awaited<ReturnType<typeof listQuizSources>>[number];

// Liste des questions reconnues ou générées, avant de les ajouter à l'éditeur.
export function ImportedQuestionList({
  questions,
}: {
  questions: ImportedQuestion[];
}) {
  return (
    <ol className="list-decimal pl-5 text-sm text-muted-foreground">
      {questions.map((q, i) => (
        <li key={i} className="truncate">
          {q.prompt}{" "}
          <span className="text-xs">
            (
            {q.type === "vrai_faux" ? "Vrai / Faux" : `${q.choix.length} choix`}
            )
          </span>
        </li>
      ))}
    </ol>
  );
}

// Génère des questions avec Claude à partir des leçons écrites de la
// thématique du quiz. Rien n'est enregistré : les questions s'ajoutent à
// l'éditeur pour être relues.
export function GenerateDialog({
  open,
  onOpenChange,
  thematiqueId,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thematiqueId: string;
  onImport: (questions: ImportedQuestion[]) => void;
}) {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(10);
  const [instructions, setInstructions] = useState("");
  const [result, setResult] = useState<{
    questions: ImportedQuestion[];
    dropped: number;
    cost: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSources, startLoadingSources] = useTransition();
  const [generating, startGenerating] = useTransition();

  // Recharge les leçons à chaque ouverture : la thématique a pu changer.
  useEffect(() => {
    if (!open || !thematiqueId) return;
    startLoadingSources(async () => {
      const list = await listQuizSources(thematiqueId);
      setSources(list);
      setSelected(new Set(list.map((s) => s.id)));
    });
  }, [open, thematiqueId]);

  function reset() {
    setSources(null);
    setResult(null);
    setError(null);
    setInstructions("");
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function generate() {
    setError(null);
    setResult(null);
    startGenerating(async () => {
      const res = await generateQuizQuestions({
        thematiqueId,
        ressourceIds: [...selected],
        count,
        instructions,
      });
      if ("error" in res) setError(res.error);
      else setResult(res);
    });
  }

  const found = result?.questions.length ?? 0;
  const selectedWords = (sources ?? [])
    .filter((s) => selected.has(s.id))
    .reduce((n, s) => n + s.words, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Générer des questions</DialogTitle>
          <DialogDescription>
            Claude écrit des questions à partir des leçons écrites de la
            thématique. Tu les relis avant d&apos;enregistrer.{" "}
            <a
              href={ANTHROPIC_BILLING_URL}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Voir mon crédit
            </a>
          </DialogDescription>
        </DialogHeader>

        {!thematiqueId ? (
          <p className="text-sm text-muted-foreground">
            Choisis d&apos;abord la thématique du quiz dans l&apos;onglet
            Réglages.
          </p>
        ) : sources === null || loadingSources ? (
          <p className="text-sm text-muted-foreground">
            Chargement des leçons…
          </p>
        ) : sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cette thématique n&apos;a pas encore de leçon écrite. Utilise
            l&apos;import ou ajoute les questions à la main.
          </p>
        ) : (
          <FieldGroup>
            <Field>
              <FieldLabel>Leçons à utiliser</FieldLabel>
              <div className="flex flex-col gap-2">
                {sources.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={() => toggle(s.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {s.words.toLocaleString("fr-FR")} mots
                    </span>
                  </label>
                ))}
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="generate-count">
                Nombre de questions
              </FieldLabel>
              <Input
                id="generate-count"
                type="number"
                min={3}
                max={20}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-24"
              />
              <FieldDescription>Entre 3 et 20.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="generate-instructions">Consigne</FieldLabel>
              <Textarea
                id="generate-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Ex. : insiste sur les conditions de validité de la prière."
              />
              <FieldDescription>Facultatif.</FieldDescription>
            </Field>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant={result ? "outline" : "default"}
                className="w-fit"
                loading={generating}
                disabled={selected.size === 0}
                onClick={generate}
              >
                <Sparkles className="size-4" />
                {generating ? "Génération…" : result ? "Régénérer" : "Générer"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {generating
                  ? "Cela peut prendre une minute."
                  : selected.size > 0 &&
                    `Coût estimé : environ ${formatCost(
                      estimateGenerationCost(selectedWords, count)
                    )}`}
              </span>
            </div>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
        )}

        {result && (
          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-sm font-medium">
              {found} question{found > 1 ? "s" : ""} générée
              {found > 1 ? "s" : ""}.{" "}
              <span className="font-normal text-muted-foreground">
                Coût réel : {formatCost(result.cost)}.
              </span>
            </p>
            {result.dropped > 0 && (
              <p className="text-sm text-muted-foreground">
                {result.dropped} question{result.dropped > 1 ? "s" : ""} mal
                formée{result.dropped > 1 ? "s" : ""} écartée
                {result.dropped > 1 ? "s" : ""}.
              </p>
            )}
            <ImportedQuestionList questions={result.questions} />
            <Button
              type="button"
              className="mt-2 w-fit"
              onClick={() => {
                onImport(result.questions);
                reset();
              }}
            >
              Ajouter {found} question{found > 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
