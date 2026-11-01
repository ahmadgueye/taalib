"use client";

import { useActionState, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Copy,
  Eye,
  FileUp,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/dashboard/submit-button";
import { QuizAttempt } from "@/components/public/quiz-attempt";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createQuiz, updateQuiz, type ActionState } from "@/lib/actions/quiz";
import type {
  ChoixDraft,
  QuestionDraft,
  QuestionType,
} from "@/lib/quiz-drafts";
import { gradeQuestions } from "@/lib/quiz-grading";
import {
  parseQuizText,
  QUIZ_IMPORT_PROMPT,
  type ImportedQuestion,
} from "@/lib/quiz-import";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "published", label: "Publié" },
  { value: "draft", label: "Brouillon" },
];

const typeOptions = [
  { value: "qcm", label: "QCM" },
  { value: "vrai_faux", label: "Vrai / Faux" },
];

type QuizTab = "questions" | "reglages";

type Meta = {
  title: string;
  description: string;
  thematiqueId: string;
  status: "draft" | "published";
  passingScore: number;
};

function newKey() {
  return crypto.randomUUID();
}

function emptyChoix(key = newKey()): ChoixDraft {
  return { key, label: "", isCorrect: false };
}

// La première question d'un nouveau quiz est rendue côté serveur : clés
// fixes, pour que le HTML corresponde au rendu du navigateur.
function emptyQuestion(key = newKey()): QuestionDraft {
  return {
    key,
    prompt: "",
    type: "qcm",
    explanation: "",
    choix: [emptyChoix(`${key}-a`), emptyChoix(`${key}-b`)],
  };
}

function vraiFauxChoix(): ChoixDraft[] {
  return [
    { key: newKey(), label: "Vrai", isCorrect: false },
    { key: newKey(), label: "Faux", isCorrect: false },
  ];
}

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function snapshot(meta: Meta, questions: QuestionDraft[]) {
  return JSON.stringify({ meta, questions });
}

// Prévient avant de quitter la page avec des modifications non enregistrées :
// fermeture de l'onglet, et clic sur un lien interne (sidebar, fil d'Ariane).
function useLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const message =
      "Tu as des modifications non enregistrées. Quitter quand même ?";

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    function onClick(event: MouseEvent) {
      const link = (event.target as Element).closest?.("a[href]");
      if (!link || link.getAttribute("target") === "_blank") return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
}

export function QuizEditor({
  quiz,
  thematiqueOptions,
  defaultThematiqueId,
  initialQuestions,
  initialTab,
}: {
  quiz?: {
    id: string;
    title: string;
    description: string | null;
    thematiqueId: string;
    status: "draft" | "published";
    passingScore: number;
  };
  thematiqueOptions: { id: string; title: string; coursTitle: string }[];
  // Création depuis la page d'une thématique : déjà choisie.
  defaultThematiqueId?: string;
  initialQuestions: QuestionDraft[];
  initialTab?: string;
}) {
  const [meta, setMeta] = useState<Meta>(() => ({
    title: quiz?.title ?? "",
    description: quiz?.description ?? "",
    thematiqueId: quiz?.thematiqueId ?? defaultThematiqueId ?? "",
    status: quiz?.status ?? "published",
    passingScore: quiz?.passingScore ?? 80,
  }));
  const [questions, setQuestions] = useState<QuestionDraft[]>(() =>
    initialQuestions.length > 0 ? initialQuestions : [emptyQuestion("new")]
  );
  // Les questions existantes s'ouvrent repliées pour garder une vue
  // d'ensemble ; une question ajoutée (ou la première d'un nouveau quiz)
  // s'ouvre.
  const [folded, setFolded] = useState<Set<string>>(
    () => new Set(initialQuestions.map((q) => q.key))
  );
  // État de référence pour savoir s'il reste des modifications à enregistrer.
  const [saved, setSaved] = useState(() => snapshot(meta, questions));

  const [state, formAction] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      if (!quiz) return createQuiz(prev, formData);
      const result = await updateQuiz(quiz.id, prev, formData);
      if (result?.questions) {
        // Les questions enregistrées portent maintenant leurs ids.
        setQuestions(result.questions);
        setSaved(snapshot(meta, result.questions));
        toast.success(result.success);
      }
      return result;
    },
    undefined
  );

  const [previewOpen, setPreviewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const dirty = snapshot(meta, questions) !== saved;
  useLeaveGuard(dirty);

  function updateQuestion(key: string, patch: Partial<QuestionDraft>) {
    setQuestions((qs) =>
      qs.map((q) => (q.key === key ? { ...q, ...patch } : q))
    );
  }

  function setQuestionType(key: string, type: QuestionType) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === key
          ? {
              ...q,
              type,
              choix:
                type === "vrai_faux"
                  ? vraiFauxChoix()
                  : q.type === "vrai_faux"
                    ? [emptyChoix(), emptyChoix()]
                    : q.choix,
            }
          : q
      )
    );
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
  }

  // Les questions importées s'ajoutent à la suite, repliées, sans rien
  // enregistrer. Une question vide restée seule (nouveau quiz) est remplacée.
  function importQuestions(imported: ImportedQuestion[]) {
    const drafts: QuestionDraft[] = imported.map((q) => ({
      ...q,
      key: newKey(),
      choix: q.choix.map((c) => ({ ...c, key: newKey() })),
    }));
    setQuestions((qs) => {
      const blank =
        qs.length === 1 &&
        !qs[0].prompt.trim() &&
        qs[0].choix.every((c) => !c.label.trim());
      return blank ? drafts : [...qs, ...drafts];
    });
    setFolded((prev) => new Set([...prev, ...drafts.map((d) => d.key)]));
    // Un nouveau quiz généré par une IA se relit avant d'être publié.
    if (!quiz) setMeta((m) => ({ ...m, status: "draft" }));
    setImportOpen(false);
    toast.success(
      `${drafts.length} question${drafts.length > 1 ? "s" : ""} ajoutée${
        drafts.length > 1 ? "s" : ""
      }. Relis-les, puis enregistre.`
    );
  }

  function duplicateQuestion(index: number) {
    const source = questions[index];
    const copy: QuestionDraft = {
      key: newKey(),
      prompt: source.prompt,
      type: source.type,
      explanation: source.explanation,
      choix: source.choix.map((c) => ({
        key: newKey(),
        label: c.label,
        isCorrect: c.isCorrect,
      })),
    };
    setQuestions((qs) => [
      ...qs.slice(0, index + 1),
      copy,
      ...qs.slice(index + 1),
    ]);
  }

  function removeQuestion(index: number) {
    const removed = questions[index];
    setQuestions((qs) => qs.filter((q) => q.key !== removed.key));
    toast(`Question ${index + 1} supprimée.`, {
      action: {
        label: "Annuler",
        onClick: () =>
          setQuestions((qs) => [
            ...qs.slice(0, index),
            removed,
            ...qs.slice(index),
          ]),
      },
    });
  }

  function toggleFolded(key: string) {
    setFolded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function updateChoix(qKey: string, cKey: string, patch: Partial<ChoixDraft>) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === qKey
          ? {
              ...q,
              choix: q.choix.map((c) =>
                c.key === cKey ? { ...c, ...patch } : c
              ),
            }
          : q
      )
    );
  }

  // Vrai/Faux : une seule bonne réponse.
  function selectCorrect(qKey: string, cKey: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === qKey
          ? {
              ...q,
              choix: q.choix.map((c) => ({ ...c, isCorrect: c.key === cKey })),
            }
          : q
      )
    );
  }

  function setChoix(
    qKey: string,
    update: (choix: ChoixDraft[]) => ChoixDraft[]
  ) {
    setQuestions((qs) =>
      qs.map((q) => (q.key === qKey ? { ...q, choix: update(q.choix) } : q))
    );
  }

  const allFolded = questions.every((q) => folded.has(q.key));

  // Un nouveau quiz s'ouvre sur ses réglages (thématique, titre). L'onglet
  // ouvert est reflété dans l'URL (?onglet=), comme sur la page d'une classe.
  const defaultTab: QuizTab =
    !quiz || initialTab === "reglages" ? "reglages" : "questions";
  function handleTabChange(value: QuizTab) {
    if (!quiz) return;
    const url = new URL(window.location.href);
    if (value === "questions") url.searchParams.delete("onglet");
    else url.searchParams.set("onglet", value);
    window.history.replaceState(null, "", url);
  }

  return (
    <>
      {/* noValidate : un champ invalide dans l'onglet masqué bloquerait l'envoi
          sans rien afficher. La validation se fait côté serveur. */}
      <form action={formAction} noValidate className="max-w-3xl">
        <input
          type="hidden"
          name="questionsJson"
          value={JSON.stringify(questions)}
        />

        <Tabs
          defaultValue={defaultTab}
          onValueChange={(value) => handleTabChange(value as QuizTab)}
          className="gap-6"
        >
          <TabsList>
            <TabsTrigger value="questions" className="px-3">
              Questions ({questions.length})
            </TabsTrigger>
            <TabsTrigger value="reglages" className="px-3">
              Réglages
            </TabsTrigger>
          </TabsList>
          <TabsContent value="questions">
            {questions.length > 1 && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFolded(
                      allFolded
                        ? new Set()
                        : new Set(questions.map((q) => q.key))
                    )
                  }
                >
                  {allFolded ? "Tout déplier" : "Tout replier"}
                </Button>
              </div>
            )}

            <div className="mt-2 flex flex-col gap-3">
              {questions.map((question, index) => (
                <QuestionCard
                  key={question.key}
                  question={question}
                  index={index}
                  total={questions.length}
                  folded={folded.has(question.key)}
                  onToggleFolded={() => toggleFolded(question.key)}
                  onChange={(patch) => updateQuestion(question.key, patch)}
                  onTypeChange={(type) => setQuestionType(question.key, type)}
                  onMove={(to) => setQuestions((qs) => move(qs, index, to))}
                  onDuplicate={() => duplicateQuestion(index)}
                  onRemove={() => removeQuestion(index)}
                  onChoixChange={(cKey, patch) =>
                    updateChoix(question.key, cKey, patch)
                  }
                  onSelectCorrect={(cKey) => selectCorrect(question.key, cKey)}
                  onChoixList={(update) => setChoix(question.key, update)}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={addQuestion}>
                <Plus className="size-4" />
                Ajouter une question
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setImportOpen(true)}
              >
                <FileUp className="size-4" />
                Importer
              </Button>
            </div>
          </TabsContent>
          {/* Toujours monté : ses champs font partie du formulaire. */}
          <TabsContent value="reglages" keepMounted>
            <FieldGroup className="max-w-2xl">
              <Field>
                <FieldLabel htmlFor="thematiqueId">Thématique</FieldLabel>
                <Select
                  name="thematiqueId"
                  value={meta.thematiqueId || null}
                  onValueChange={(v) =>
                    v && setMeta((m) => ({ ...m, thematiqueId: v }))
                  }
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
                  value={meta.title}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, title: e.target.value }))
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  name="description"
                  value={meta.description}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, description: e.target.value }))
                  }
                  rows={2}
                />
                <FieldDescription>Facultatif.</FieldDescription>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="status">Statut</FieldLabel>
                  <Select
                    name="status"
                    value={meta.status}
                    onValueChange={(v) =>
                      v &&
                      setMeta((m) => ({ ...m, status: v as Meta["status"] }))
                    }
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
                  <FieldLabel htmlFor="passingScore">
                    Score minimum pour réussir (%)
                  </FieldLabel>
                  <Input
                    id="passingScore"
                    name="passingScore"
                    type="number"
                    min={0}
                    max={100}
                    value={meta.passingScore}
                    onChange={(e) =>
                      setMeta((m) => ({
                        ...m,
                        passingScore: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </Field>
              </div>
              <FieldDescription>
                Un étudiant doit atteindre le score minimum pour que
                l&apos;étape soit terminée sur sa feuille de route.
              </FieldDescription>
            </FieldGroup>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 z-10 mt-8 flex flex-wrap items-center gap-3 border-t bg-background py-3">
          <SubmitButton>{quiz ? "Enregistrer" : "Créer le quiz"}</SubmitButton>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="size-4" />
            Aperçu élève
          </Button>
          {state?.error ? (
            <FieldError>{state.error}</FieldError>
          ) : (
            dirty &&
            quiz && (
              <span className="text-sm text-muted-foreground">
                Modifications non enregistrées
              </span>
            )
          )}
        </div>
      </form>
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={importQuestions}
      />
      {/* Hors du formulaire : l'aperçu contient son propre formulaire. */}
      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={meta.title}
        questions={questions}
      />
    </>
  );
}

function QuestionCard({
  question,
  index,
  total,
  folded,
  onToggleFolded,
  onChange,
  onTypeChange,
  onMove,
  onDuplicate,
  onRemove,
  onChoixChange,
  onSelectCorrect,
  onChoixList,
}: {
  question: QuestionDraft;
  index: number;
  total: number;
  folded: boolean;
  onToggleFolded: () => void;
  onChange: (patch: Partial<QuestionDraft>) => void;
  onTypeChange: (type: QuestionType) => void;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onChoixChange: (cKey: string, patch: Partial<ChoixDraft>) => void;
  onSelectCorrect: (cKey: string) => void;
  onChoixList: (update: (choix: ChoixDraft[]) => ChoixDraft[]) => void;
}) {
  const number = index + 1;
  const isTrueFalse = question.type === "vrai_faux";

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onToggleFolded}
          aria-expanded={!folded}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              !folded && "rotate-90"
            )}
          />
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            Question {number}
          </span>
          {folded && (
            <span className="truncate text-sm">
              {question.prompt || (
                <span className="text-muted-foreground italic">
                  Sans énoncé
                </span>
              )}
            </span>
          )}
        </button>
        {folded && (
          <Badge variant="outline" className="shrink-0">
            {isTrueFalse ? "Vrai / Faux" : "QCM"}
          </Badge>
        )}
        <div className="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(index - 1)}
            disabled={index === 0}
            aria-label={`Monter la question ${number}`}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(index + 1)}
            disabled={index === total - 1}
            aria-label={`Descendre la question ${number}`}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDuplicate}
            aria-label={`Dupliquer la question ${number}`}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            disabled={total === 1}
            aria-label={`Supprimer la question ${number}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {!folded && (
        <FieldGroup className="border-t p-4">
          <Field>
            <FieldLabel htmlFor={`prompt-${question.key}`}>Énoncé</FieldLabel>
            <Textarea
              id={`prompt-${question.key}`}
              value={question.prompt}
              onChange={(e) => onChange({ prompt: e.target.value })}
              rows={2}
            />
          </Field>

          <Field>
            <FieldLabel>Type</FieldLabel>
            <Select
              value={question.type}
              onValueChange={(v) => v && onTypeChange(v as QuestionType)}
              items={typeOptions}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>
              {isTrueFalse
                ? "Bonne réponse"
                : "Choix (coche la ou les bonnes réponses)"}
            </FieldLabel>
            <div
              className="flex flex-col gap-2"
              role={isTrueFalse ? "radiogroup" : undefined}
            >
              {question.choix.map((choix, cIndex) => (
                <div key={choix.key} className="flex items-center gap-2">
                  {isTrueFalse ? (
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`correct-${question.key}`}
                        checked={choix.isCorrect}
                        onChange={() => onSelectCorrect(choix.key)}
                        className="size-4 accent-primary"
                      />
                      {choix.label}
                    </label>
                  ) : (
                    <>
                      <Checkbox
                        checked={choix.isCorrect}
                        onCheckedChange={(checked) =>
                          onChoixChange(choix.key, {
                            isCorrect: checked === true,
                          })
                        }
                        aria-label={`Choix ${cIndex + 1} correct`}
                      />
                      <Input
                        value={choix.label}
                        onChange={(e) =>
                          onChoixChange(choix.key, { label: e.target.value })
                        }
                        placeholder={`Choix ${cIndex + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          onChoixList((cs) => move(cs, cIndex, cIndex - 1))
                        }
                        disabled={cIndex === 0}
                        aria-label={`Monter le choix ${cIndex + 1}`}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          onChoixList((cs) => move(cs, cIndex, cIndex + 1))
                        }
                        disabled={cIndex === question.choix.length - 1}
                        aria-label={`Descendre le choix ${cIndex + 1}`}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          onChoixList((cs) =>
                            cs.filter((c) => c.key !== choix.key)
                          )
                        }
                        disabled={question.choix.length <= 2}
                        aria-label={`Retirer le choix ${cIndex + 1}`}
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
            {!isTrueFalse && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-fit"
                onClick={() => onChoixList((cs) => [...cs, emptyChoix()])}
              >
                <Plus className="size-4" />
                Ajouter un choix
              </Button>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor={`explanation-${question.key}`}>
              Explication (affichée après correction)
            </FieldLabel>
            <Textarea
              id={`explanation-${question.key}`}
              value={question.explanation}
              onChange={(e) => onChange({ explanation: e.target.value })}
              rows={2}
            />
          </Field>
        </FieldGroup>
      )}
    </div>
  );
}

// Le quiz tel que l'élève le verra, avec l'état en cours de l'éditeur
// (enregistré ou non). La correction se fait sur place : rien n'est envoyé.
function PreviewDialog({
  open,
  onOpenChange,
  title,
  questions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  questions: QuestionDraft[];
}) {
  const graded = questions.map((q) => ({
    id: q.key,
    prompt: q.prompt,
    explanation: q.explanation || null,
    choix: q.choix.map((c) => ({
      id: c.key,
      label: c.label,
      isCorrect: c.isCorrect,
    })),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title || "Quiz sans titre"}</DialogTitle>
          <DialogDescription>
            Aperçu : tu peux répondre pour vérifier les corrections, rien
            n&apos;est enregistré.
          </DialogDescription>
        </DialogHeader>
        <QuizAttempt
          quizId=""
          questions={questions.map((q) => ({
            id: q.key,
            prompt: q.prompt,
            type: q.type,
            choix: q.choix.map((c) => ({ id: c.key, label: c.label })),
          }))}
          previewGrade={(answers) => gradeQuestions(graded, answers)}
        />
      </DialogContent>
    </Dialog>
  );
}

// Colle des questions générées ailleurs (le chat de NotebookLM, avec le prompt
// fourni) : elles sont lues en direct et ajoutées à l'éditeur.
function ImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (questions: ImportedQuestion[]) => void;
}) {
  const [text, setText] = useState("");
  const { questions, errors } = parseQuizText(text);
  const count = questions.length;

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(QUIZ_IMPORT_PROMPT);
      toast.success("Prompt copié. Colle-le dans le chat de NotebookLM.");
    } catch {
      toast.error(
        "Copie impossible. Sélectionne le texte du prompt à la main."
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setText("");
      }}
    >
      <DialogContent className="max-h-[90vh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importer des questions</DialogTitle>
          <DialogDescription>
            Copie le prompt, colle-le dans le chat de NotebookLM (en précisant
            le sujet), puis colle sa réponse ci-dessous.
          </DialogDescription>
        </DialogHeader>

        <details className="rounded-md border text-sm">
          <summary className="cursor-pointer px-3 py-2 text-muted-foreground">
            Voir le prompt et le format attendu
          </summary>
          <pre className="max-h-60 overflow-auto border-t px-3 py-2 text-xs whitespace-pre-wrap">
            {QUIZ_IMPORT_PROMPT}
          </pre>
        </details>
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={copyPrompt}
        >
          <Copy className="size-4" />
          Copier le prompt NotebookLM
        </Button>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"Q: …\n- [x] …\n- [ ] …\nExplication: …"}
          aria-label="Questions à importer"
          className="max-h-[45vh] font-mono text-xs"
        />

        {text.trim() && (
          <div className="flex flex-col gap-2 text-sm">
            <p className={cn("font-medium", count === 0 && "text-destructive")}>
              {count === 0
                ? "Aucune question reconnue. Vérifie que chaque question commence par « Q: »."
                : `${count} question${count > 1 ? "s" : ""} reconnue${count > 1 ? "s" : ""}.`}
            </p>
            {errors.length > 0 && (
              <ul className="flex flex-col gap-1 text-destructive">
                {errors.map((e) => (
                  <li key={e.block}>
                    Question {e.block} ignorée : {e.message}
                  </li>
                ))}
              </ul>
            )}
            {count > 0 && (
              <ol className="list-decimal pl-5 text-muted-foreground">
                {questions.map((q, i) => (
                  <li key={i} className="truncate">
                    {q.prompt}{" "}
                    <span className="text-xs">
                      (
                      {q.type === "vrai_faux"
                        ? "Vrai / Faux"
                        : `${q.choix.length} choix`}
                      )
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        <Button
          type="button"
          className="w-fit"
          disabled={count === 0}
          onClick={() => {
            onImport(questions);
            setText("");
          }}
        >
          {count > 0
            ? `Ajouter ${count} question${count > 1 ? "s" : ""}`
            : "Ajouter"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
