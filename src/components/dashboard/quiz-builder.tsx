"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { SubmitButton } from "@/components/dashboard/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveQuizQuestions, type ActionState } from "@/lib/actions/quiz-questions";

type QuestionType = "qcm" | "vrai_faux";

type ChoixDraft = { label: string; isCorrect: boolean };
type QuestionDraft = {
  prompt: string;
  type: QuestionType;
  explanation: string;
  choix: ChoixDraft[];
};

function emptyChoix(): ChoixDraft {
  return { label: "", isCorrect: false };
}

function emptyQuestion(): QuestionDraft {
  return {
    prompt: "",
    type: "qcm",
    explanation: "",
    choix: [emptyChoix(), emptyChoix()],
  };
}

function vraiFauxChoix(): ChoixDraft[] {
  return [
    { label: "Vrai", isCorrect: false },
    { label: "Faux", isCorrect: false },
  ];
}

const typeOptions = [
  { value: "qcm", label: "QCM" },
  { value: "vrai_faux", label: "Vrai / Faux" },
];

export function QuizBuilder({
  quizId,
  initialQuestions,
}: {
  quizId: string;
  initialQuestions: QuestionDraft[];
}) {
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initialQuestions.length > 0 ? initialQuestions : [emptyQuestion()]
  );
  const action = saveQuizQuestions.bind(null, quizId);
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined
  );

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  }

  function setQuestionType(index: number, type: QuestionType) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === index
          ? { ...q, type, choix: type === "vrai_faux" ? vraiFauxChoix() : q.choix }
          : q
      )
    );
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }

  function updateChoix(qIndex: number, cIndex: number, patch: Partial<ChoixDraft>) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              choix: q.choix.map((c, j) => (j === cIndex ? { ...c, ...patch } : c)),
            }
          : q
      )
    );
  }

  function addChoix(qIndex: number) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qIndex ? { ...q, choix: [...q.choix, emptyChoix()] } : q))
    );
  }

  function removeChoix(qIndex: number, cIndex: number) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qIndex ? { ...q, choix: q.choix.filter((_, j) => j !== cIndex) } : q
      )
    );
  }

  return (
    <form action={formAction} className="max-w-2xl">
      <input
        type="hidden"
        name="questionsJson"
        value={JSON.stringify(questions)}
      />
      <div className="flex flex-col gap-6">
        {questions.map((question, qIndex) => (
          <div key={qIndex} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <span className="font-medium text-muted-foreground">
                Question {qIndex + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeQuestion(qIndex)}
                disabled={questions.length === 1}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <FieldGroup className="mt-3">
              <Field>
                <FieldLabel htmlFor={`prompt-${qIndex}`}>Énoncé</FieldLabel>
                <Textarea
                  id={`prompt-${qIndex}`}
                  value={question.prompt}
                  onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                  rows={2}
                  required
                />
              </Field>

              <Field>
                <FieldLabel>Type</FieldLabel>
                <Select
                  value={question.type}
                  onValueChange={(v) => v && setQuestionType(qIndex, v as QuestionType)}
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
                <FieldLabel>Choix (cocher la/les bonne(s) réponse(s))</FieldLabel>
                <div className="flex flex-col gap-2">
                  {question.choix.map((choix, cIndex) => (
                    <div key={cIndex} className="flex items-center gap-2">
                      <Checkbox
                        checked={choix.isCorrect}
                        onCheckedChange={(checked) =>
                          updateChoix(qIndex, cIndex, { isCorrect: checked === true })
                        }
                      />
                      <Input
                        value={choix.label}
                        onChange={(e) =>
                          updateChoix(qIndex, cIndex, { label: e.target.value })
                        }
                        placeholder={`Choix ${cIndex + 1}`}
                        disabled={question.type === "vrai_faux"}
                        required
                      />
                      {question.type === "qcm" && question.choix.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeChoix(qIndex, cIndex)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {question.type === "qcm" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-fit"
                    onClick={() => addChoix(qIndex)}
                  >
                    <Plus className="size-4" />
                    Ajouter un choix
                  </Button>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor={`explanation-${qIndex}`}>
                  Explication (affichée après correction)
                </FieldLabel>
                <Textarea
                  id={`explanation-${qIndex}`}
                  value={question.explanation}
                  onChange={(e) =>
                    updateQuestion(qIndex, { explanation: e.target.value })
                  }
                  rows={2}
                />
              </Field>
            </FieldGroup>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addQuestion} className="w-fit">
          <Plus className="size-4" />
          Ajouter une question
        </Button>

        {state?.error && <FieldError>{state.error}</FieldError>}
        <SubmitButton>Enregistrer les questions</SubmitButton>
      </div>
    </form>
  );
}
