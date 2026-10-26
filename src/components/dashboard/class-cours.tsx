"use client";

import { useActionState, useTransition } from "react";
import {
  ChevronRight,
  HelpCircle,
  Lock,
  LockOpen,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DeleteButton } from "@/components/dashboard/delete-button";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addClassCours,
  removeClassCours,
  setQuizUnlocked,
  setRessourceUnlocked,
  unlockAllInThematique,
  unlockNextRessource,
  type ActionState,
} from "@/lib/actions/classes";
import type { ClassCoursOutline } from "@/lib/db/queries/classes";
import { ressourceTypeConfig } from "@/lib/ressource-types";

export function ClassCours({
  classId,
  cours,
  availableCours,
}: {
  classId: string;
  cours: ClassCoursOutline[];
  availableCours: { id: string; title: string }[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {cours.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun cours dans cette classe.
        </p>
      ) : (
        cours.map((c) => <CoursBlock key={c.id} classId={classId} cours={c} />)
      )}
      <AddCoursForm
        key={availableCours.map((c) => c.id).join(",")}
        classId={classId}
        availableCours={availableCours}
      />
    </div>
  );
}

function AddCoursForm({
  classId,
  availableCours,
}: {
  classId: string;
  availableCours: { id: string; title: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    addClassCours.bind(null, classId),
    undefined
  );

  if (availableCours.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tous les cours existants font déjà partie de cette classe.
      </p>
    );
  }

  const items = availableCours.map((c) => ({ value: c.id, label: c.title }));

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <Select name="coursId" items={items} required>
          <SelectTrigger className="flex-1" aria-label="Cours à ajouter">
            <SelectValue placeholder="Choisir un cours à ajouter" />
          </SelectTrigger>
          <SelectContent>
            {items.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SubmitButton>Ajouter</SubmitButton>
      </div>
      {state?.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}

function CoursBlock({
  classId,
  cours,
}: {
  classId: string;
  cours: ClassCoursOutline;
}) {
  return (
    <div className="border">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <p className="min-w-0 truncate font-medium" title={cours.title}>
          {cours.title}
        </p>
        <DeleteButton
          action={removeClassCours.bind(null, classId, cours.id)}
          itemLabel={cours.title}
          title={`Retirer « ${cours.title} » de la classe ?`}
          description="Le cours n'est pas supprimé. Ses déblocages pour cette classe sont effacés."
          confirmLabel="Retirer"
        />
      </div>
      {cours.thematiques.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          Ce cours n&apos;a pas encore de thématique.
        </p>
      ) : (
        <div className="divide-y">
          {cours.thematiques.map((t) => (
            <ThematiqueBlock key={t.id} classId={classId} thematique={t} />
          ))}
        </div>
      )}
    </div>
  );
}

type Thematique = ClassCoursOutline["thematiques"][number];

function ThematiqueBlock({
  classId,
  thematique,
}: {
  classId: string;
  thematique: Thematique;
}) {
  const [isPending, startTransition] = useTransition();
  const { ressources, quiz } = thematique;
  const unlockedRessources = ressources.filter((r) => r.unlockedAt).length;
  const unlockedQuiz = quiz.filter((q) => q.unlockedAt).length;
  const allUnlocked =
    unlockedRessources === ressources.length && unlockedQuiz === quiz.length;
  const isEmpty = ressources.length === 0 && quiz.length === 0;
  // Déplier d'office la thématique en cours de déblocage.
  const inProgress = unlockedRessources + unlockedQuiz > 0 && !allUnlocked;

  function run(action: () => Promise<{ error?: string } | void>) {
    startTransition(async () => {
      const result = await action();
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <details open={inProgress} className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 hover:bg-muted/50">
        <span className="flex min-w-0 items-center gap-2">
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          <span className="truncate text-sm font-medium" title={thematique.title}>
            {thematique.title}
          </span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {isEmpty
            ? "Vide"
            : `Ressources ${unlockedRessources}/${ressources.length}${
                quiz.length > 0 ? ` · Quiz ${unlockedQuiz}/${quiz.length}` : ""
              }`}
        </span>
      </summary>

      {!isEmpty && (
        <div className="px-4 pb-3">
          {!allUnlocked && (
            <div className="flex flex-wrap gap-2 py-2">
              {unlockedRessources < ressources.length && (
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    run(() => unlockNextRessource(classId, thematique.id))
                  }
                >
                  <LockOpen className="size-4" />
                  Débloquer la suivante
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  run(() => unlockAllInThematique(classId, thematique.id))
                }
              >
                Tout débloquer
              </Button>
            </div>
          )}
          <ul className="divide-y border-t">
            {ressources.map((r) => (
              <ItemRow
                key={r.id}
                icon={ressourceTypeConfig[r.type].icon}
                kind={ressourceTypeConfig[r.type].label}
                title={r.title}
                unlockedAt={r.unlockedAt}
                disabled={isPending}
                onToggle={() =>
                  run(() => setRessourceUnlocked(classId, r.id, !r.unlockedAt))
                }
              />
            ))}
            {quiz.map((q) => (
              <ItemRow
                key={q.id}
                icon={HelpCircle}
                kind="Quiz"
                title={q.title}
                unlockedAt={q.unlockedAt}
                disabled={isPending}
                onToggle={() =>
                  run(() => setQuizUnlocked(classId, q.id, !q.unlockedAt))
                }
              />
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}

function ItemRow({
  icon: Icon,
  kind,
  title,
  unlockedAt,
  disabled,
  onToggle,
}: {
  icon: LucideIcon;
  kind: string;
  title: string;
  unlockedAt: Date | null;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-label={kind} />
        <span className="truncate" title={title}>
          {title}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {unlockedAt ? (
          <Badge>
            Depuis le {new Date(unlockedAt).toLocaleDateString("fr-FR")}
          </Badge>
        ) : (
          <Badge variant="secondary">À venir</Badge>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label={unlockedAt ? `Verrouiller ${title}` : `Débloquer ${title}`}
          title={unlockedAt ? "Verrouiller" : "Débloquer"}
          onClick={onToggle}
        >
          {/* L'icône montre l'état actuel ; l'infobulle dit ce que fait le clic. */}
          {unlockedAt ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
        </Button>
      </span>
    </li>
  );
}
